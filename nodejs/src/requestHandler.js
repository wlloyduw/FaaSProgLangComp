class RequestHandler {

    /**
     * @param {Object} request
     * @param context
     * @return {Promise<Object>}
     */
    async handleRequest(request, context) {}

    asLambda() {
        let self = this;
        return {
            handleRequest(request, context) {
                return new Promise((resolve, reject) => {
                    self.handleRequest(request, context).then(resolve).catch(reject);
                });
            }
        };
    }

}

module.exports = RequestHandler;