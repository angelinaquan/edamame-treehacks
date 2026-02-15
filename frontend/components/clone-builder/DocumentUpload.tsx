"use client";

import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, Loader2 } from "lucide-react";

interface DocumentUploadProps {
  cloneId: string;
  onUpload?: (result: { filename: string; chunks: number }) => void;
}

interface UploadedFile {
  name: string;
  chunks: number;
  status: "uploading" | "done" | "error";
}

export function DocumentUpload({ cloneId, onUpload }: DocumentUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    for (const file of Array.from(files)) {
      setUploadedFiles((prev) => [
        ...prev,
        { name: file.name, chunks: 0, status: "uploading" },
      ]);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("cloneId", cloneId);

        const res = await fetch("/api/ingest", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.name === file.name
              ? { ...f, chunks: data.chunks_created, status: "done" }
              : f
          )
        );

        onUpload?.({ filename: file.name, chunks: data.chunks_created });
      } catch {
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.name === file.name ? { ...f, status: "error" } : f
          )
        );
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all ${
          isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
            : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
        }`}
      >
        <Upload
          size={24}
          className={isDragging ? "text-blue-500" : "text-zinc-400"}
        />
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Drop files here or click to upload
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Meeting notes, design docs, READMEs, writeups
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".txt,.md,.pdf,.doc,.docx"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Uploaded files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <FileText size={16} className="shrink-0 text-zinc-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-800 truncate dark:text-zinc-200">
                  {file.name}
                </p>
                {file.status === "done" && (
                  <p className="text-[10px] text-zinc-400">
                    {file.chunks} chunks created
                  </p>
                )}
              </div>
              {file.status === "uploading" && (
                <Loader2
                  size={16}
                  className="shrink-0 animate-spin text-blue-500"
                />
              )}
              {file.status === "done" && (
                <CheckCircle2
                  size={16}
                  className="shrink-0 text-green-500"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
