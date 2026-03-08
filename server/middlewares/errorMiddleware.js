exports.errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: err.name || 'Internal Server Error',
        message: err.message || 'Something went wrong on the server'
    });
};
