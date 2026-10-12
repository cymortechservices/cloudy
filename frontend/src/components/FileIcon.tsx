import { File, FileImage, FileSpreadsheet, FileText, Presentation } from 'lucide-react';
export function FileIcon({ ext, className = 'w-6 h-6' }: { ext: string; className?: string }) {
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return <FileImage className={`${className} text-emerald-400`} aria-hidden />;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet className={`${className} text-green-400`} aria-hidden />;
  if (['ppt', 'pptx'].includes(ext)) return <Presentation className={`${className} text-orange-400`} aria-hidden />;
  if (ext === 'pdf') return <FileText className={`${className} text-red-400`} aria-hidden />;
  if (['doc', 'docx', 'txt'].includes(ext)) return <FileText className={`${className} text-sky-400`} aria-hidden />;
  return <File className={className} aria-hidden />;
}
