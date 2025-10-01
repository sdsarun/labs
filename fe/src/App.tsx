/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-explicit-any */

import "filepond/dist/filepond.min.css";

import { Button } from "@/components/ui/button";
import axios from "axios";
import type { FilePondFile } from "filepond";
import { useEffect, useRef, useState } from "react";
import { FilePond } from "react-filepond";

export type UploadFileParam = {
  mode: "init" | "complete" | "fail";
  userId?: string; // Add userId for init
  files?: { filename: string; mimetype: string; size: number }[]; // for init
  fileIds?: string[]; // for complete/fail
};

export type UploadResponse = {
  fileId: string;
  objectKey: string;
  presignedUrl: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
};

export const fileStatus = {
  PENDING: "PENDING",
  UPLOADED: "UPLOADED",
  FAILED: "FAILED",
  PROCESSING: "PROCESSING"
};

export type ServerFile = {
  id: string;
  filename: string;
  mimetype: string;
  path: string;
  size: number;
  status: Status;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  userId: string;
};

export type Status = (typeof fileStatus)[keyof typeof fileStatus];

type FetchFilesQuery = {
  status?: Status;
};

const fetch = axios.create({
  baseURL: "http://localhost:3000"
});

const userId = "b4028151-0adc-4e61-aca6-c1d88a197fe9";

function App() {
  const [files, setFiles] = useState<FilePondFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const filepondRef = useRef<FilePond | null>(null);

  const fetchFiles = async (query?: FetchFilesQuery) => {
    const { data } = await fetch.get<ServerFile[]>(`/files/file-list/${userId}`, {
      params: { ...query }
    });
    return data;
  };

  const uploadFile = async (payload: any): Promise<UploadResponse[]> => {
    const { data } = await fetch.post(`/files/upload`, payload);
    return data;
  };

  const uploadToPresignedUrl = async (url: string, file: File) => {
    return fetch.put(url, file, {
      headers: {
        "Content-Type": file.type
      }
    });
  };

  const previewFile = async (fileId: string) => {
    const { data } = await fetch.get<{ previewUrl: string }>(`/files/preview/${fileId}`);
    return data;
  };

  useEffect(() => {
    const init = async () => {
      const serverFiles = await fetchFiles({ status: "UPLOADED" });
      const mappedFiles = serverFiles.map((file) => ({
        source: { ...file, name: file.filename },
        load: true,
        options: {
          type: "local"
        }
      })) as unknown as FilePondFile[];
      setFiles(mappedFiles);
    };
    init();
  }, []);

  const handleUpload = async () => {
    setIsUploading(true);
    const body: UploadFileParam = {
      mode: "init",
      userId,
      files: files.map((file) => ({
        filename: file.filename,
        mimetype: file.fileType,
        size: file.fileSize
      }))
    };

    try {
      const uploadedResponse: UploadResponse[] = await uploadFile(body);
      if (uploadedResponse.length > 0) {
        await Promise.all(
          uploadedResponse.map(async (file, index) => {
            const filePondFile = files[index];
            if (filePondFile) {
              uploadToPresignedUrl(file.presignedUrl, filePondFile.file as File);
            }
          })
        );

        const completeBody: UploadFileParam = {
          mode: "complete",
          fileIds: uploadedResponse.map((file) => file.fileId)
        };
        const completeResponse = await uploadFile(completeBody);
        console.log("[LOG] - App.tsx:59 - handleUpload - completeResponse:", completeResponse);
      }
    } catch (error) {
      console.log("[LOG] - App.tsx:64 - handleUpload - error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <FilePond
        ref={filepondRef}
        name="files"
        files={files as any}
        credits={false}
        onupdatefiles={(files) => {
          console.log("[LOG] - App.tsx:45 - App - files:", files);
          setFiles(files);
        }}
        server={{
          load: async (source, load, error, progress) => {
            const { previewUrl } = await previewFile(source.id);
            try {
              const { data } = await axios.get(previewUrl, {
                responseType: "blob",
                onDownloadProgress: (e) => {
                  progress(e.lengthComputable, e.loaded, e?.total || 0);
                }
              });
              const file = new File([data], source.filename, { type: source.mimetype });
              load(file);
            } catch {
              error("Something went wrong");
            }
          }
        }}
        allowMultiple
        required
      />
      <Button isLoading={isUploading} onClick={handleUpload}>
        Upload
      </Button>
    </div>
  );
}

export default App;
