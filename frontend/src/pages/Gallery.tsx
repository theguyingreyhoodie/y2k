import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Check, Copy, Download, Globe, Lock, Pencil, Share2, Trash2, WandSparkles } from "lucide-react";
import { ConfirmDialog, Dialog } from "@/components/Dialog";
import { Window } from "@/components/Window";
import { api, downloadBlob, errorMessage, fetchBlob, slugFilename, type Edit } from "@/lib/api";

const dateFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });

export default function Gallery() {
  const navigate = useNavigate();
  const [edits, setEdits] = useState<Edit[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [sharing, setSharing] = useState<Edit | null>(null);
  const [deleting, setDeleting] = useState<Edit | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);

  const load = () => {
    setLoadError("");
    api
      .get<Edit[]>("/edits")
      .then(setEdits)
      .catch((err) => setLoadError(errorMessage(err)));
  };
  useEffect(load, []);

  const replace = (next: Edit) => {
    setEdits((list) => list?.map((e) => (e.id === next.id ? next : e)) ?? null);
    setSharing((s) => (s && s.id === next.id ? next : s));
  };

  const download = async (e: Edit) => {
    try {
      downloadBlob(await fetchBlob(`/edits/${e.id}/image?v=${e.version}`), slugFilename(e.title));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusyDelete(true);
    try {
      await api.del(`/edits/${deleting.id}`);
      setEdits((list) => list?.filter((e) => e.id !== deleting.id) ?? null);
      toast.success("Edit deleted");
      setDeleting(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyDelete(false);
    }
  };

  const rename = async (e: Edit, title: string) => {
    setRenaming(null);
    const clean = title.trim();
    if (!clean || clean === e.title) return;
    try {
      replace(await api.patch<Edit>(`/edits/${e.id}`, { title: clean }));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <main className="page gallery" id="main">
      <header className="page__head">
        <div>
          <h1 className="page__title">Your gallery</h1>
          <p className="page__lede">
            {edits === null ? "Loading your edits…" : edits.length === 0 ? "Nothing saved yet." : `${edits.length} ${edits.length === 1 ? "edit" : "edits"}, newest first.`}
          </p>
        </div>
        <Link to="/editor" className="btn btn--lg">
          <WandSparkles size={18} aria-hidden="true" />
          New edit
        </Link>
      </header>

      {loadError ? (
        <Window title="error.log" className="gallery__notice">
          <p className="form-error" role="alert">
            {loadError}
          </p>
          <button type="button" className="btn btn--chrome btn--sm" onClick={load}>
            Try again
          </button>
        </Window>
      ) : edits === null ? (
        <div className="gallery__grid" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton gallery__skeleton" />
          ))}
        </div>
      ) : edits.length === 0 ? (
        <Window title="empty.txt" className="gallery__notice" bodyClassName="gallery__empty">
          <img src="/stickers/cd.svg" alt="" width={96} height={96} />
          <h2>No edits yet</h2>
          <p>Make your first one and it lands here, with every layer kept so you can come back and tweak it.</p>
          <Link to="/editor" className="btn">
            Start editing
          </Link>
        </Window>
      ) : (
        <ul className="gallery__grid" role="list">
          {edits.map((e) => (
            <li key={e.id}>
              <Window
                as="article"
                title={`${e.title}.png`}
                className="card"
                bodyClassName="card__body"
                actions={
                  e.is_public ? (
                    <span className="card__public" title="Anyone with the link can view">
                      <Globe size={12} strokeWidth={2.6} aria-hidden="true" />
                      <span className="visually-hidden">Public</span>
                    </span>
                  ) : null
                }
              >
                <button type="button" className="card__image" onClick={() => navigate(`/editor?edit=${e.id}`)} aria-label={`Re-edit ${e.title}`}>
                  <img src={`/api/edits/${e.id}/thumb?v=${e.version}`} alt="" loading="lazy" width={e.width} height={e.height} />
                </button>
                <div className="card__meta">
                  {renaming === e.id ? (
                    <input
                      className="input card__rename"
                      defaultValue={e.title}
                      maxLength={80}
                      autoFocus
                      aria-label="Edit title"
                      onBlur={(ev) => rename(e, ev.target.value)}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter") (ev.target as HTMLInputElement).blur();
                        if (ev.key === "Escape") setRenaming(null);
                      }}
                    />
                  ) : (
                    <button type="button" className="card__title" onClick={() => setRenaming(e.id)} title="Rename">
                      <span>{e.title}</span>
                      <Pencil size={12} aria-hidden="true" />
                    </button>
                  )}
                  <p className="card__sub">
                    {dateFmt.format(new Date(e.updated_at))} · <span className="tabular">{e.width} × {e.height}</span>
                  </p>
                </div>
                <div className="card__actions">
                  <Link to={`/editor?edit=${e.id}`} className="btn btn--sm">
                    <WandSparkles size={14} aria-hidden="true" />
                    Re-edit
                  </Link>
                  <button type="button" className="tool" onClick={() => download(e)} aria-label="Download PNG" title="Download PNG">
                    <Download size={16} aria-hidden="true" />
                  </button>
                  <button type="button" className="tool" onClick={() => setSharing(e)} aria-label="Share" title="Share">
                    <Share2 size={16} aria-hidden="true" />
                  </button>
                  <button type="button" className="tool tool--danger" onClick={() => setDeleting(e)} aria-label="Delete" title="Delete">
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </Window>
            </li>
          ))}
        </ul>
      )}

      <ShareDialog edit={sharing} onClose={() => setSharing(null)} onChange={replace} />
      <ConfirmDialog
        open={!!deleting}
        title="delete.exe"
        message={`Delete "${deleting?.title}"? Its share link stops working too. This can't be undone.`}
        confirmLabel="Delete edit"
        danger
        busy={busyDelete}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </main>
  );
}

function ShareDialog({ edit, onClose, onChange }: { edit: Edit | null; onClose: () => void; onChange: (e: Edit) => void }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const link = edit?.share_slug ? `${window.location.origin}/share/${edit.share_slug}` : "";
  const image = edit?.share_slug ? `${window.location.origin}/api/public/edits/${edit.share_slug}/image` : "";
  const caption = "Made this Y2K edit on Y2KEDIT ★";

  const toggle = async (isPublic: boolean) => {
    if (!edit) return;
    setBusy(true);
    try {
      onChange(await api.post<Edit>(`/edits/${edit.id}/share`, { is_public: isPublic }));
      toast.success(isPublic ? "Public link is live" : "Edit is private again");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy. Select the link and copy it yourself.");
    }
  };

  const shared = !!edit?.is_public && !!link;
  return (
    <Dialog open={!!edit} title="share.exe" onClose={onClose} width={480}>
      {edit ? (
        <>
          <div className="share__status">
            {shared ? <Globe size={20} className="share__icon share__icon--on" aria-hidden="true" /> : <Lock size={20} className="share__icon" aria-hidden="true" />}
            <div>
              <p className="share__state">{shared ? "Anyone with the link can view it" : "Only you can see this edit"}</p>
              <p className="hint">{shared ? "Make it private any time; the link stops working until you share again." : "Create a link to post it anywhere."}</p>
            </div>
          </div>
          {shared ? (
            <>
              <div className="share__link">
                <input className="input" readOnly value={link} aria-label="Share link" onFocus={(e) => e.target.select()} />
                <button type="button" className="btn btn--chrome btn--sm" onClick={copy}>
                  {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="share__socials">
                <a
                  className="btn btn--pink btn--sm"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(link)}&media=${encodeURIComponent(image)}&description=${encodeURIComponent(caption)}`}
                >
                  Pinterest
                </a>
                <a className="btn btn--sm" target="_blank" rel="noopener noreferrer" href={`https://x.com/intent/post?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(link)}`}>
                  X
                </a>
                <a
                  className="btn btn--chrome btn--sm"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://www.tumblr.com/widgets/share/tool?canonicalUrl=${encodeURIComponent(link)}&caption=${encodeURIComponent(caption)}`}
                >
                  Tumblr
                </a>
              </div>
              <div className="dialog__actions">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => toggle(false)} disabled={busy}>
                  <Lock size={14} aria-hidden="true" />
                  Make private
                </button>
              </div>
            </>
          ) : (
            <div className="dialog__actions">
              <button type="button" className="btn" onClick={() => toggle(true)} disabled={busy}>
                <Globe size={16} aria-hidden="true" />
                {busy ? "Creating link…" : "Create public link"}
              </button>
            </div>
          )}
        </>
      ) : null}
    </Dialog>
  );
}
