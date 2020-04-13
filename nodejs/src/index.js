exports.handler = async(event, context) => {
    return (require('./function'))(event, context);
};