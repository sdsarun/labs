import React, { useState } from "react";
import { FilePond, registerPlugin } from "react-filepond";
import "filepond/dist/filepond.min.css";
import type { FilePondFile } from "filepond";

type UploadProps = {
  debug?: boolean;
};

const Upload = ({}: UploadProps) => {
  const [files, setFiles] = useState<FilePondFile[]>([]);

  return (
    <div>
      <FilePond
        files={files}
        onupdatefiles={setFiles}
        labelIdle='Drag & Drop your files or <span class="filepond--label-action">Browse</span>'
      />
      <div>
        <h3 className="font-bold">Debug</h3>
        <pre>{JSON.stringify(files, null, 2)}</pre>
      </div>
    </div>
  );
};

export default Upload;
