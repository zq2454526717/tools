const gulp = require('gulp');
const babel = require('gulp-babel');
const through = require('through2');
const cheerio = require('cheerio');
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generator = require("@babel/generator").default;
const t = require("@babel/types");
const uglify = require('gulp-uglify');
const es2015 = require('babel-preset-es2015')
const stage3 = require('babel-preset-stage-3')

// 辅助函数，用于解析 WXML 文件中的所有 class 和动态绑定的类名
function extractClasses(content) {
  const $ = cheerio.load(content, { xmlMode: true });
  const usedClasses = new Set();

  // 添加类名
  const addClass = (str) => {
    const classStr = str.trim().replace(/{{[^{&^}]+}}/, '.*');
    if (!['?', ':', '||', '!', '&&', '}}', '{{', '+', '(', ')'].find(item => classStr.includes(item)) && classStr !== '.*') {
      usedClasses.add(classStr);
    }
  };

  const loopFn = (str) => {
    const match = str.split(' ');
    if (match.length > 1) {
      match.forEach(item => {
        if (item) {
          loopFn(item);
        }
      });
    } else {
      if (/[a-zA-Z0-9_-]+\{\{[a-zA-Z0-9_\.]+\}\}|\{\{[a-zA-Z0-9_\.]+\}\}[a-zA-Z0-9_-]+/.test(str)) {
        addClass(str);
        return;
      }

      const match = str.match(/[a-zA-Z0-9_-]+|'[a-zA-Z0-9_-]+'|"[a-zA-Z0-9_-\s]+"|[a-zA-Z0-9_-]+\{\{[a-zA-Z0-9_\.]+\}\}|\{\{[a-zA-Z0-9_\.]+\}\}[a-zA-Z0-9_-]+/g);

      if (match && match.length == 1 && match[0] == str) {
        str = str.replace(/\'/g, '').replace(/\"/g, '');
        addClass(str);
      } else if (match) {
        match.forEach(item => {
          const str = item.replace(/\'/g, '').replace(/\"/g, '');
          if (str) {
            loopFn(str);
          }
        });
      } else {
        addClass(str);
      }
    }
  };

  const matchClassNames = '[class],[my-class],[iconClass],[placeholder-class]';

  // 查找所有使用 class 和动态绑定类名的元素
  $('[class],[my-class],[iconClass],[placeholder-class]').each((i, elem) => {
    matchClassNames.split(/[\[\],]/).forEach((item) => {
      if (item) {
        const classStr = $(elem).attr(item);
        if (classStr) {
          loopFn(classStr);
        }
      }
    });
  });

  return Array.from(usedClasses);
}

// 分析WXSS文件，并保留被WXML中引用的样式
gulp.task('analyze-wxss', () => {
  const allClasses = new Set();  // 存储所有被引用的类名
  allClasses.add('text');
  allClasses.add('view');
  allClasses.add('image');
  allClasses.add('swiper');
  allClasses.add('swiper-item');
  allClasses.add('scroll-view');
  allClasses.add('cover-image');
  allClasses.add('cover-view');
  allClasses.add('input');


  // 检查类名是否被使用
  const checkUsed = (className) => {
    for (const value of allClasses) {
      if (value.includes('.*') && new RegExp(`^${value}$`).test(className) || allClasses.has(className)) {
        return true;
      }
    }
    return false;
  }

  return gulp.src(['./**/*.js', '!./node_modules/**', '!gulpfile.js', '!cleanup-unused-code.js'])
    .pipe(through.obj(function (file, _, cb) {
      const content = file.contents.toString();
      const ast = parser.parse(content, {
        sourceType: "module",
      });

      traverse(ast, {
        StringLiteral(path) {
          // 收集所有字符串
          const { node } = path;
          allClasses.add(node.value);
        },
        TemplateLiteral(path) {
          // 拼接成字符串,变量替换成.*
          const { node } = path;
          const { quasis, expressions } = node;
          let str = '';
          quasis.forEach((item, index) => {
            str += item.value.raw;
            if (expressions[index]) {
              str += '.*';
            }
          });

          // 不包含中文的str加入到allClasses
          if (!/[\u4e00-\u9fa5\/\|:\^\&\#\-\=\?\s\[\]]/.test(str) && !/^[\.\*]+$/g.test(str)) {
            console.log(str)
            allClasses.add(str);
          }
        },
      });
      cb();
    })).on('end', () => {
      gulp.src('./**/*.wxml')
        .pipe(through.obj((file, enc, cb) => {
          const content = file.contents.toString();
          extractClasses(content).forEach(cls => allClasses.add(cls));
          cb();
        }, function (cb) {
          gulp.src('./**/*.wxss')
            .pipe(through.obj(function (file, enc, cb2) {
              const css = file.contents.toString();

              const newCss = css.replace(/\.([^{}\*\/;]+)\s*{[^}]*}/g, (match, className) => {
                const classNames = className.split(',');
                let resultNames = [];
              
                if (/{[\n\s]*}/.test(match)) {
                  return '';
                }

                classNames.forEach(item => {
                  const classItems = item.split(' ');
                  let isUsed = true;

                  isUsed = !classItems.find(it => {
                    return it.split(/[.>]/).find(i => {
                      const name = i.trim().replace(/:[^.]+/, '').replace(/\[[a-zA-Z0-9_-]+\]/, '').replace(/\./, '');
                      return !checkUsed(name);
                    })
                  });

                  if (isUsed) {
                    resultNames.push(item);
                  }
                })

                if (resultNames.length == classNames.length) {
                  return match;
                } else if (resultNames.length) {
                  resultNames[0] = resultNames[0].replace(/\n/, '');
                  return (resultNames[0].replace(/\n/, '')[0] == '.' ? '' : '.') + resultNames.join(',') + match.match(/\s*{[^}]*}/g)[0];
                } else {
                  return '';  // 移除未被使用的类
                }
              });
              file.contents = Buffer.from(newCss);
              this.push(file);
              cb2();
            }))
            .pipe(gulp.dest('./'))
            .on('end', cb);
        }))
        .pipe(gulp.dest('./')); // 输出处理后的WXML到指定目录
    });
});

// 统计所有静态字符串出现的次数
gulp.task('count-static-str', () => {
  // 统计所有静态字符串出现的次数
  const strs = {};

  return gulp.src(['./**/*.js', '!./node_modules/**', '!gulpfile.js', '!cleanup-unused-code.js'])
    .pipe(through.obj(function (file, _, cb) {
      const content = file.contents.toString();
      const ast = parser.parse(content, {
        sourceType: "module",
      });

      traverse(ast, {
        StringLiteral(path) {
          // 收集所有字符串
          const { node } = path;
          // 如何父级不是ImportDeclaration且不是require方法，说明是静态字符串
          if (path.parent.type !== 'ImportDeclaration' && !(path.parent.type == 'CallExpression' && path.parent.callee.name == 'require')) {
            const str = node.value;

            if (strs[str]) {
              strs[str]++;
            } else {
              strs[str] = 1;
            }
          }
        },
      });
      cb();
    })).on('end', () => {
      // 统计所有字符串出现的次数*字符长度 = 总字符长度，将总字符长度排序，取前10个 打印出来
      const totalStrs = Object.keys(strs).map(key => {
        return {
          str: key,
          count: strs[key],
          total: key.length * strs[key]
        }
      }).sort((a, b) => b.total - a.total).slice(0, 50).filter(item => item.count > 1);

      console.log(totalStrs);
      // 统计totalStrs所有字符的长度和并打印出来
      const totalLength = totalStrs.reduce((prev, curr) => prev + curr.total, 0);
      console.log('totalLength:', totalLength);
    });
});

// 压缩 JavaScript 任务
gulp.task('compress-js', function () {
  return gulp.src(['./**/*.js', '!./node_modules/**', '!gulpfile.js', '!cleanup-unused-code.js']) // 指定源文件目录
    .pipe(through.obj(function (file, _, cb) {
      const content = file.contents.toString();
      const ast = parser.parse(content, {
        sourceType: "module",
      });

      traverse(ast, {
        // 删除未使用的函数
        FunctionDeclaration(path) {
            const functionName = path.node.id.name;
            const binding = path.scope.getBinding(functionName);

            if (binding && binding.referencePaths.length === 0) {
                path.remove();
            }
        },
        VariableDeclarator(path) {
            const { id } = path.node;
            const binding = path.scope.getBinding(id.name);

            // 检查变量是否被使用，如果没有引用则删除
            if (!binding || binding.referencePaths.length === 0) {
                path.remove();
            }
        },
        CallExpression(path) {
          // 判断调用的函数是否为console对象的方法
          if (t.isMemberExpression(path.node.callee) &&
            t.isIdentifier(path.node.callee.object, { name: "console" })) {
            // 删除console调用语句
            path.remove();
          }
        },
      });

      // 生成新的代码
      const newCode = generator(ast).code;

      // 将新代码写回文件
      file.contents = Buffer.from(newCode);
      this.push(file);
      cb();
    }))
    .pipe(through.obj(function (file, _, cb) {
      const content = file.contents.toString();
      const ast = parser.parse(content, {
        sourceType: "module",
      });

      // 存储字符串字面量和它们的出现次数
      const stringLiterals = {};
      const uniqueNames = new Set();

      // 遍历AST，寻找所有字符串字面量
      traverse(ast, {
        StringLiteral(path) {
          const node = path.node;
          const value = node.value;

          // 如何父级不是ImportDeclaration且不是require方法，说明是静态字符串
          if (path.parent.type !== 'ImportDeclaration' && !(path.parent.type == 'CallExpression' && path.parent.callee.name == 'require') && value) {
            if (stringLiterals[value]) {
              stringLiterals[value].count++;
              stringLiterals[value].nodes.push(node);
            } else {
              stringLiterals[value] = { count: 1, nodes: [node] };
            }
          }
        },
      });

      // 替换重复字符串，并在顶部添加常量定义
      const topScopeStatements = [];
      Object.keys(stringLiterals).forEach(str => {
        if (stringLiterals[str].count > 1) {
          let constantName = '_' + str.toUpperCase().replace(/[^A-Z0-9]/gi, '_');
          let index = 1;
          // 确保常量名是唯一的
          while (uniqueNames.has(constantName)) {
            constantName = `${constantName}_${index++}`;
          }
          uniqueNames.add(constantName);

          const constantDeclaration = t.variableDeclaration("const", [
            t.variableDeclarator(t.identifier(constantName), t.stringLiteral(str))
          ]);
          topScopeStatements.push(constantDeclaration);

          stringLiterals[str].nodes.forEach(node => {
            node.name = constantName;
            Object.assign(node, t.identifier(constantName));
          });
        }
      });

      // 将常量声明添加到AST的顶部
      ast.program.body.unshift(...topScopeStatements);

      // 生成新的代码
      const newCode = generator(ast).code;

      // 将新代码写回文件
      file.contents = Buffer.from(newCode);
      this.push(file);
      cb();
    }))
    .pipe(babel({
      presets: [es2015, stage3] // 使用 @babel/preset-env 替代 es2015 和 stage-3
    }))
    .pipe(uglify({
      mangle: {
        toplevel: true // 开启顶级作用域变量和函数名的修改
      }
    }))            // 压缩 JavaScript 文件
    .pipe(gulp.dest('./'));   // 输出到 dist 目录
});

// 默认任务
gulp.task('default', gulp.series('analyze-wxss'));
