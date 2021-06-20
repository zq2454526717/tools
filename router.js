class Router {
    query = {}

    constructor() {
        this.query = Router.getQuery();
    }

    static getQuery() {
        const query = {};

        location.search.slice(1).split("&").forEach(queryStr => {
            const queryArr = queryStr.split("=");
            query[queryArr[0]] = queryArr[1];
        })
        return query
    }
}

export default Router