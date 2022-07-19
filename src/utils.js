const getResponseBody = async (req) => {
  const buffers = []
  for await (const chunk of req) {
    buffers.push(chunk)
  }

  const data = Buffer.concat(buffers).toString();
  if (data === "") return undefined;
  return data;
};

module.exports = {
  getResponseBody
}