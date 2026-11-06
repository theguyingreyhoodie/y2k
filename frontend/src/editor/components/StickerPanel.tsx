import { useEffect, useRef, useState } from "react";
import { Globe, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/Dialog";
import { Window } from "@/components/Window";
import { api, errorMessage, type CustomSticker } from "@/lib/api";
import { BUILTIN_STICKERS, STICKER_GROUPS, registerCustomSticker, stickerUrl } from "../stickers";

interface StickerPanelProps {
  disabled: boolean;
  stickers: CustomSticker[];
  onStickersChange: (next: CustomSticker[]) => void;
  onAdd: (ref: string) => void;
  isAdmin: boolean;
}

export function StickerPanel({ disabled, stickers, onStickersChange, onAdd, isAdmin }: StickerPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ file: File; preview: string } | null>(null);
  const [name, setName] = useState("");
  const [cutOut, setCutOut] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<CustomSticker | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => () => {
    if (pending) URL.revokeObjectURL(pending.preview);
  }, [pending]);

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Stickers need to be an image (PNG, JPG or WebP).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Sticker images can be up to 8 MB.");
      return;
    }
    setPending({ file, preview: URL.createObjectURL(file) });
    setName(file.name.replace(/\.[^.]+$/, "").slice(0, 40));
    setCutOut(file.type !== "image/png");
  };

  const upload = async () => {
    if (!pending) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", pending.file);
      form.append("name", name.trim() || "sticker");
      form.append("remove_background", String(cutOut));
      const created = await api.post<CustomSticker>("/stickers", form);
      registerCustomSticker(created.id, created.version);
      onStickersChange([created, ...stickers]);
      setPending(null);
      toast.success(created.is_public ? "Sticker published for everyone" : "Sticker added to your collection");
      if (!disabled) onAdd(`custom:${created.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.del(`/stickers/${toDelete.id}`);
      onStickersChange(stickers.filter((s) => s.id !== toDelete.id));
      toast.success("Sticker deleted");
      setToDelete(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Window
      title="stickers.zip"
      className="panel"
      bodyClassName="stickers"
      actions={
        <button type="button" className="window__action" onClick={() => fileRef.current?.click()}>
          <ImagePlus size={11} strokeWidth={3} aria-hidden="true" />
          Upload
        </button>
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {pending ? (
        <div className="sticker-upload">
          <img src={pending.preview} alt="" className="sticker-upload__preview" />
          <div className="sticker-upload__form">
            <label className="field">
              <span className="label">Name</span>
              <input className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="check">
              <input type="checkbox" checked={cutOut} onChange={(e) => setCutOut(e.target.checked)} />
              <span>Cut out the white background</span>
            </label>
            {isAdmin ? <p className="hint">You're an admin, so this sticker is shared with everyone.</p> : null}
            <div className="sticker-upload__actions">
              <button type="button" className="btn btn--chrome btn--sm" onClick={() => setPending(null)} disabled={uploading}>
                Cancel
              </button>
              <button type="button" className="btn btn--pink btn--sm" onClick={upload} disabled={uploading}>
                {uploading ? <LoaderCircle size={14} className="spin" aria-hidden="true" /> : null}
                {uploading ? "Cutting out…" : "Add sticker"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {STICKER_GROUPS.map((g) => (
        <section key={g.id} className="stickers__group" aria-labelledby={`stickers-${g.id}`}>
          <h3 className="panel-heading" id={`stickers-${g.id}`}>
            {g.label}
          </h3>
          <div className="sticker-grid">
            {BUILTIN_STICKERS.filter((s) => s.group === g.id).map((s) => (
              <button
                key={s.key}
                type="button"
                className={`sticker-btn${s.tile ? ` sticker-btn--${s.tile}` : ""}`}
                disabled={disabled}
                onClick={() => onAdd(`builtin:${s.key}`)}
                title={s.label}
                aria-label={`Add ${s.label}`}
              >
                <img src={`/stickers/${s.file}`} alt="" loading="lazy" draggable={false} />
              </button>
            ))}
          </div>
        </section>
      ))}

      <div className="stickers__mine">
        <h3 className="panel-heading">Your stickers</h3>
        {stickers.length === 0 ? (
          <p className="hint">
            Upload a PNG or a photo on white and we'll cut it out.{" "}
            <button type="button" className="link-btn" onClick={() => fileRef.current?.click()}>
              Upload one
            </button>
          </p>
        ) : (
          <div className="sticker-grid" role="group" aria-label="Your stickers">
            {stickers.map((s) => {
              const ref = `custom:${s.id}`;
              registerCustomSticker(s.id, s.version);
              return (
                <div key={s.id} className="sticker-cell">
                  <button
                    type="button"
                    className="sticker-btn"
                    disabled={disabled}
                    onClick={() => onAdd(ref)}
                    title={s.name}
                    aria-label={`Add ${s.name}`}
                  >
                    <img src={stickerUrl(ref)!} alt="" loading="lazy" draggable={false} />
                  </button>
                  {s.is_public ? (
                    <span className="sticker-cell__badge" title="Shared with everyone">
                      <Globe size={10} strokeWidth={3} aria-hidden="true" />
                    </span>
                  ) : null}
                  {s.can_delete ? (
                    <button type="button" className="sticker-cell__delete" aria-label={`Delete ${s.name}`} onClick={() => setToDelete(s)}>
                      <Trash2 size={11} strokeWidth={2.6} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="delete.exe"
        message={`Delete "${toDelete?.name}"? Edits that already use it keep their saved PNG, but it disappears from re-edits.`}
        confirmLabel="Delete sticker"
        danger
        busy={deleting}
        onConfirm={remove}
        onClose={() => setToDelete(null)}
      />
    </Window>
  );
}
