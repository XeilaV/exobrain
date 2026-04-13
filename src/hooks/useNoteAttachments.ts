import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Attachment {
  id: string;
  noteId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  contentType: string;
  createdAt: string;
  publicUrl: string;
}

export function useNoteAttachments(noteId: string) {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const loadAttachments = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("note_attachments")
      .select("*")
      .eq("note_id", noteId)
      .order("created_at", { ascending: false });

    if (data) {
      setAttachments(
        data.map((r: any) => {
          const { data: urlData } = supabase.storage
            .from("note-attachments")
            .getPublicUrl(r.file_path);
          return {
            id: r.id,
            noteId: r.note_id,
            fileName: r.file_name,
            filePath: r.file_path,
            fileSize: r.file_size,
            contentType: r.content_type,
            createdAt: r.created_at,
            publicUrl: urlData.publicUrl,
          };
        })
      );
    }
  }, [noteId, user]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!user) return;
      setUploading(true);
      try {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${user.id}/${noteId}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("note-attachments")
          .upload(path, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase.from("note_attachments").insert({
          note_id: noteId,
          user_id: user.id,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          content_type: file.type || "application/octet-stream",
        });

        if (dbError) throw dbError;

        await loadAttachments();
        toast.success("Archivo subido");
      } catch (e: any) {
        toast.error("Error al subir: " + (e.message || ""));
      } finally {
        setUploading(false);
      }
    },
    [user, noteId, loadAttachments]
  );

  const deleteAttachment = useCallback(
    async (attachment: Attachment) => {
      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
      await supabase.storage.from("note-attachments").remove([attachment.filePath]);
      await supabase.from("note_attachments").delete().eq("id", attachment.id);
      toast.success("Archivo eliminado");
    },
    []
  );

  return { attachments, uploading, uploadFile, deleteAttachment };
}
