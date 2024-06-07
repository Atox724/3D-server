import http from "http";
import url from "url";
import fs from "fs";
import path from "path";

const HMI_DIR = path.join(process.cwd(), "hmi");

const getFileDetails = (filePath: string) => {
  const stats = fs.statSync(filePath);
  const filePathRelative = path.relative(process.cwd(), filePath);
  return {
    path: filePathRelative,
    size: (stats.size / (1024 * 1024)).toFixed(1) + "MB",
    name: path.basename(filePath),
    type: "file",
    modifyTime: new Date(stats.mtime)
      .toISOString()
      .replace("T", " ")
      .split(".")[0],
    urlHMI: "",
    preSigned: `http://localhost:3000/?file=${encodeURIComponent(
      filePathRelative
    )}`, // You can populate this with your actual presigned URL logic
  };
};

const server = http.createServer((req, res) => {
  if (!req.url) return;
  const { query } = url.parse(req.url, true);
  if (query.path) {
    fs.readdir(HMI_DIR, (err, files) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            code: "error.internal_server_error",
            message: "Internal Server Error",
          })
        );
        return;
      }

      const hmiFiles = files
        .filter((file) => file.endsWith(".hmi"))
        .map((file) => getFileDetails(path.join(HMI_DIR, file)));

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          code: "success.ok",
          message: "OK",
          data: hmiFiles,
        })
      );
    });
  } else if (query.file) {
    const filePath = path.join(process.cwd(), query.file as string);

    if (filePath && filePath.startsWith(HMI_DIR) && fs.existsSync(filePath)) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.writeHead(200, { "Content-Type": "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          code: "error.not_found",
          message: "File Not Found",
        })
      );
    }
  }
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000/");
});
