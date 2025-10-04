import { randomUUID as uuid } from "node:crypto";
import jason from "@/jason.js";
import { Client as Minio } from "minio";

const app = jason();
const s3 = new Minio({
  endPoint: "192.168.1.161",
  port: 19001,
  useSSL: false,
  accessKey: "admin",
  secretKey: "P@ssw0rd1234"
});

app.post(
  "/upload",
  {
    uploads: {
      fields: [{ name: "files" }],
      directory: "upload-naja",
      keepExtensions: true,
      memory: true
    }
  },
  (req, res) => {
    console.log(req?.files);
    for (const file of req?.files || []) {
      if (file.buffer) {
        const { buffer, ...meta } = file;
        s3.putObject("test", uuid(), buffer, meta.size, {
          "content-type": meta.mimeType,
          ...meta
        });
      }
    }
    res.status(200).json("HELLO WORLD");
  }
);

app.get("/stream/:fileId", async (req, res) => {
  const fileId = req.params.fileId;
  console.log(fileId);
  try {
    const object = await s3.getObject("test", fileId);
    res.status(200).stream(object);
  } catch (error) {
    res.status(500).json({
      error: "GET_STREAM_FILE_ERROR",
      details: error
    });
  }
});

export default app;
