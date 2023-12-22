module.exports.sendResponse = (res, data) => {
  const response = {
    success: data?.success,
    message: data?.message,
  };

  if (data) {
    response.statusCode = data?.statusCode;
    if (data?.result) {
      response.data = data?.result;
    }
  }

  res.status(response.statusCode || 200).json(response);
};
