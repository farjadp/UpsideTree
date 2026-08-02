"use client";

import { useState, useEffect } from "react";
import { 
  Upload, Folder, Image as ImageIcon, Video, FileText, Search, Grid, List, 
  Trash2, Download, Sparkles, X, Check, FolderPlus, ExternalLink 
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface MediaItem {
  id: string;
  filename: string;
  original_name: string;
  url: string;
  thumbnail_url?: string;
  file_type: 'image' | 'video' | 'document';
  mime_type: string;
  size_bytes: number;
  width?: number;
  height?: number;
  alt_text_en?: string;
  alt_text_fa?: string;
  folder: string;
  created_at: string;
}

const FOLDERS = [
  { id: "all", name: "All Media", icon: Folder },
  { id: "products", name: "Products", icon: Folder },
  { id: "collections", name: "Collections", icon: Folder },
  { id: "story", name: "Story Posts", icon: Folder },
  { id: "branding", name: "Branding", icon: Folder },
  { id: "uncategorized", name: "Uncategorized", icon: Folder },
];

export default function MediaLibraryPage() {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState("all");
  const [fileTypeFilter, setFileTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [altTextEn, setAltTextEn] = useState("");
  const [altTextFa, setAltTextFa] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  useEffect(() => {
    fetchMedia();
  }, [selectedFolder, fileTypeFilter, searchQuery]);

  const fetchMedia = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedFolder !== "all") params.append("folder", selectedFolder);
      if (fileTypeFilter !== "all") params.append("file_type", fileTypeFilter);
      if (searchQuery) params.append("search", searchQuery);

      const res = await fetch(`/api/admin/media?${params.toString()}`);
      const data = await res.json();
      if (data.media) {
        setMediaList(data.media);
      }
    } catch (err) {
      console.error("Failed to load media", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append("file", files[i]);
      formData.append("folder", selectedFolder === "all" ? "uncategorized" : selectedFolder);

      try {
        await fetch("/api/admin/media", {
          method: "POST",
          body: formData,
        });
      } catch (err) {
        console.error("Failed uploading file", files[i].name, err);
      }
    }
    setIsUploading(false);
    fetchMedia();
  };

  const handleDeleteMedia = async (id: string) => {
    if (!confirm("Are you sure you want to delete this media item?")) return;
    try {
      await fetch(`/api/admin/media?id=${id}`, { method: "DELETE" });
      setSelectedMedia(null);
      fetchMedia();
    } catch (err) {
      console.error("Failed to delete media", err);
    }
  };

  const generateAltWithAi = async () => {
    if (!selectedMedia) return;
    setIsAiGenerating(true);
    // AI alt text prompt simulation (connects to Claude API in Step 15)
    setTimeout(() => {
      setAltTextEn(`Persian cultural artwork featuring ${selectedMedia.original_name.split('.')[0]} motif`);
      setAltTextFa(`اثری هنری و فرهنگی با نقش ${selectedMedia.original_name.split('.')[0]}`);
      setIsAiGenerating(false);
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold text-white tracking-tight">Media Library</h1>
          <p className="text-sm text-slate-400 mt-1">Manage assets, images, and documents for your store.</p>
        </div>

        <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-lapis-600 to-lapis-500 hover:from-lapis-500 hover:to-lapis-400 text-white font-medium text-sm shadow-[0_4px_20px_rgba(29,78,137,0.4)] transition-all transform hover:-translate-y-0.5">
          <Upload className="w-4 h-4" />
          {isUploading ? "Uploading..." : "Upload Files"}
          <input type="file" multiple onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar: Folders */}
        <div className="rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 p-4 space-y-2">
          <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Folders
            <button className="text-slate-400 hover:text-white"><FolderPlus className="w-4 h-4" /></button>
          </div>
          {FOLDERS.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setSelectedFolder(folder.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                selectedFolder === folder.id
                  ? "bg-lapis-600/40 text-white border border-lapis-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <folder.icon className={`w-4 h-4 ${selectedFolder === folder.id ? "text-gold-400" : "text-slate-500"}`} />
                {folder.name}
              </div>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-3 flex-1 min-w-[200px]">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search media..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-lapis-500/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={fileTypeFilter}
                onChange={(e) => setFileTypeFilter(e.target.value)}
                className="bg-slate-950/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
                <option value="document">Documents</option>
              </select>

              <div className="flex items-center bg-slate-950/50 border border-white/10 rounded-xl p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === "grid" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === "list" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Media Grid / List */}
          {mediaList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-slate-500 bg-slate-900/30">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-400" />
              <p className="text-base font-medium text-slate-300">No media items found</p>
              <p className="text-sm text-slate-500 mt-1">Upload images or change your search filter.</p>
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" : "space-y-2"}>
              {mediaList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedMedia(item);
                    setAltTextEn(item.alt_text_en || "");
                    setAltTextFa(item.alt_text_fa || "");
                  }}
                  className={`group relative rounded-2xl border overflow-hidden cursor-pointer transition-all ${
                    selectedMedia?.id === item.id
                      ? "border-gold-400 ring-2 ring-gold-400/20 shadow-[0_0_20px_rgba(180,134,53,0.2)]"
                      : "border-white/10 bg-slate-900/40 hover:border-white/30"
                  }`}
                >
                  <div className="aspect-square bg-slate-950 flex items-center justify-center overflow-hidden">
                    {item.file_type === "image" ? (
                      <img src={item.url} alt={item.filename} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <FileText className="w-10 h-10 text-slate-600" />
                    )}
                  </div>
                  <div className="p-2.5 bg-slate-950/80 backdrop-blur-sm border-t border-white/5">
                    <p className="text-xs font-medium text-slate-200 truncate">{item.original_name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{(item.size_bytes / 1024).toFixed(0)} KB</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Slide-in Detail Drawer */}
      {selectedMedia && (
        <div className="fixed inset-y-0 right-0 w-96 bg-slate-950/95 backdrop-blur-xl border-l border-white/10 p-6 z-50 overflow-y-auto space-y-6 shadow-2xl animate-slide-in-right">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="font-semibold text-white">Attachment Details</h3>
            <button onClick={() => setSelectedMedia(null)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="aspect-square rounded-xl overflow-hidden bg-slate-900 border border-white/10">
            <img src={selectedMedia.url} alt={selectedMedia.original_name} className="w-full h-full object-contain" />
          </div>

          <div className="space-y-2 text-xs text-slate-400 bg-slate-900/50 p-3 rounded-xl border border-white/5">
            <div className="flex justify-between"><span className="text-slate-500">File:</span> <span className="font-mono text-slate-300">{selectedMedia.original_name}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Size:</span> <span>{(selectedMedia.size_bytes / 1024).toFixed(1)} KB</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Folder:</span> <span className="capitalize">{selectedMedia.folder}</span></div>
          </div>

          <div className="space-y-4">
            <button
              onClick={generateAltWithAi}
              disabled={isAiGenerating}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-gold-600/30 to-gold-500/10 border border-gold-500/30 text-gold-300 hover:text-gold-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4 text-gold-400" />
              {isAiGenerating ? "Generating Alt Text..." : "✦ Generate Alt Text with AI"}
            </button>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Alt Text (English)</label>
              <input
                type="text"
                value={altTextEn}
                onChange={(e) => setAltTextEn(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">متن جایگزین (فارسی)</label>
              <input
                type="text"
                dir="rtl"
                value={altTextFa}
                onChange={(e) => setAltTextFa(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 font-persian"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <a href={selectedMedia.url} target="_blank" rel="noreferrer" className="text-xs text-lapis-400 hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Full Size
            </a>
            <button
              onClick={() => handleDeleteMedia(selectedMedia.id)}
              className="text-xs text-pomegranate-400 hover:text-pomegranate-300 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Delete Permanently
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
