import { useEffect, useState } from "react";
import { FolderPlus, Download, Eye, Trash2, FileText } from "lucide-react";
import {
  getFolders,
  createFolder,
  deleteFolder,
  getDocumentsByApplication,
  getAllDocuments,
  uploadDocument,
  deleteDocument,
} from "../services/documentService";

// Triggers a browser download from a base64 data URL, without using a
// literal JSX anchor tag in the markup (built up in memory instead).
function triggerDownload(dataUrl, filename) {
  const link = window.document.createElement("a");
  link.href = dataUrl;
  link.download = filename || "download";
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
}

// Opens a file in a new tab for previewing (PDFs/images render inline;
// other types fall back to the browser's own download prompt). Converts
// the base64 data URL to a Blob first — raw data: URLs can hit length
// limits in some browsers' window.open, a blob: URL doesn't.
function viewFile(dataUrl) {
  if (!dataUrl) return;
  const [meta, base64] = dataUrl.split(",");
  const mimeMatch = meta.match(/data:(.*);base64/);
  const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";

  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const blob = new Blob([bytes], { type: mime });
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank", "noopener,noreferrer");
  // Give the new tab time to actually load the blob before revoking it.
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
}

// Usage (scoped to one job):     <DocumentsTab applicationRef="APP-1046" applicationId={application._id} />
// Usage (admin Documents tab):   <DocumentsTab />   — no applicationRef means "show everything"
export default function DocumentsTab({ applicationRef, applicationId }) {
  const [folders, setFolders] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadingFolder, setUploadingFolder] = useState(null);
  const [deletingFolder, setDeletingFolder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationRef]);

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [folderList, docs] = await Promise.all([
        getFolders(),
        applicationRef ? getDocumentsByApplication(applicationRef) : getAllDocuments(),
      ]);
      setFolders(folderList);
      setGrouped(docs);
    } catch (err) {
      setError("Couldn't load documents");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      const folder = await createFolder(name);
      setFolders((prev) => [...prev, folder]);
      setNewFolderName("");
      setShowNewFolder(false);
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't create folder");
    }
  };

  const handleDeleteFolder = async (folder) => {
    const fileCount = (grouped[folder.name] || []).length;
    const confirmed = window.confirm(
      fileCount > 0
        ? `"${folder.name}" has ${fileCount} file${fileCount === 1 ? "" : "s"} in it. Delete the files first, then remove this folder.`
        : `Delete the folder "${folder.name}"?`
    );
    if (!confirmed) return;

    setDeletingFolder(folder._id);
    setError("");
    try {
      await deleteFolder(folder._id);
      setFolders((prev) => prev.filter((f) => f._id !== folder._id));
      setGrouped((prev) => {
        const next = { ...prev };
        delete next[folder.name];
        return next;
      });
    } catch (err) {
      // Backend returns 400 with a message when the folder still has
      // documents in it — surface that instead of a generic failure.
      setError(err.response?.data?.error || "Couldn't delete folder");
    } finally {
      setDeletingFolder(null);
    }
  };

  const handleUpload = async (folderName, file) => {
    setUploadingFolder(folderName);
    setError("");
    try {
      const doc = await uploadDocument({
        file,
        folderName,
        applicationRef,
        applicationId,
      });
      setGrouped((prev) => ({
        ...prev,
        [folderName]: [doc, ...(prev[folderName] || [])],
      }));
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed");
    } finally {
      setUploadingFolder(null);
    }
  };

  const handleDelete = async (docId, folderName) => {
    try {
      await deleteDocument(docId);
      setGrouped((prev) => ({
        ...prev,
        [folderName]: (prev[folderName] || []).filter((d) => d._id !== docId),
      }));
    } catch (err) {
      setError("Couldn't delete file");
    }
  };

  const totalDocs = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);

  if (loading) {
    return <p className="text-sm text-[#8A938D] py-10 text-center">Loading documents…</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-[#525F58]">
          {totalDocs} document{totalDocs !== 1 ? "s" : ""} across {folders.length} folder
          {folders.length !== 1 ? "s" : ""}
        </p>
        <button
          type="button"
          onClick={() => setShowNewFolder((v) => !v)}
          className="inline-flex items-center gap-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-sm py-2 px-4 rounded-md transition"
        >
          <FolderPlus size={14} />
          New Folder
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {showNewFolder && (
        <div className="flex gap-2 mb-5">
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            placeholder="Folder name (e.g. ID Proof)"
            className="flex-1 bg-white border border-[#CBD0CA] rounded-md px-3 py-2 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#3B82F6]"
          />
          <button
            type="button"
            onClick={handleCreateFolder}
            className="bg-[#1E2422] hover:bg-black text-white font-semibold text-sm py-2 px-4 rounded-md transition"
          >
            Create
          </button>
        </div>
      )}

      {folders.length === 0 ? (
        <p className="text-sm text-[#8A938D] py-10 text-center">
          No folders yet — create one above to start uploading documents.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {folders.map((folder) => {
            const files = grouped[folder.name] || [];
            return (
              <div
                key={folder._id}
                className="border border-[#EDEFEF] rounded-lg p-4 bg-white"
              >
                <div className="flex items-center justify-between mb-3 gap-2">
                  <span className="text-sm font-semibold text-[#1E2422] truncate">{folder.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-[#8A938D]">
                      {files.length} file{files.length !== 1 ? "s" : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteFolder(folder)}
                      disabled={deletingFolder === folder._id}
                      title="Delete folder"
                      className="text-[#8A938D] hover:text-red-600 disabled:opacity-40"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <ul className="space-y-2 mb-3">
                  {files.map((f) => (
                    <li
                      key={f._id}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span
                        title={f.originalName}
                        className="flex items-center gap-1.5 text-[#1E2422] truncate"
                      >
                        <FileText size={12} className="shrink-0 text-[#8A938D]" />
                        <span className="truncate">{f.originalName}</span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => viewFile(f.data)}
                          title="View"
                        >
                          <Eye size={12} className="text-[#8A938D] hover:text-[#3B82F6]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerDownload(f.data, f.originalName)}
                          title="Download"
                        >
                          <Download size={12} className="text-[#8A938D] hover:text-[#3B82F6]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(f._id, folder.name)}
                          title="Delete file"
                        >
                          <Trash2 size={12} className="text-[#8A938D] hover:text-red-600" />
                        </button>
                      </div>
                    </li>
                  ))}
                  {files.length === 0 && (
                    <li className="text-xs text-[#CBD0CA]">No files yet</li>
                  )}
                </ul>

                <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#525F58] border border-[#CBD0CA] rounded-md px-3 py-1.5 cursor-pointer hover:border-[#3B82F6] hover:text-[#3B82F6] transition">
                  {uploadingFolder === folder.name ? "Uploading…" : "+ Upload file"}
                  <input
                    type="file"
                    hidden
                    disabled={uploadingFolder === folder.name}
                    onChange={(e) => e.target.files[0] && handleUpload(folder.name, e.target.files[0])}
                  />
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}