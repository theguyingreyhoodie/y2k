import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Download, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { Window } from "@/components/Window";
import { api, downloadBlob, errorMessage, slugFilename, type PublicEdit } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { presetLabel } from "@/editor/presets";

export default function ShareView() {
  const { slug = "" } = useParams();
  const { user } = useAuth();
  const [edit, setEdit] = useState<PublicEdit | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get<PublicEdit>(`/public/edits/${encodeURIComponent(slug)}`)
      .then((e) => {
        if (!alive) return;
        setEdit(e);
        document.title = `${e.title} · Y2KEDIT`;
      })
      .catch(() => alive && setMissing(true));
    return () => {
      alive = false;
    };
  }, [slug]);

  const image = edit ? `/api/public/edits/${encodeURIComponent(slug)}/image?v=${edit.version}` : "";

  const download = async () => {
    if (!edit) return;
    try {
      const res = await fetch(image);
      if (!res.ok) throw new Error("Couldn't download the image.");
      downloadBlob(await res.blob(), slugFilename(edit.title));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (missing) {
    return (
      <main className="page share share--missing" id="main">
        <Window title="404.exe" className="share__window" bodyClassName="share__missing">
          <img src="/stickers/hanging_spider.webp" alt="" width={110} height={176} />
          <h1>This edit isn't here.</h1>
          <p>It was made private or deleted. Make one of your own instead.</p>
          <Link to={user ? "/editor" : "/register"} className="btn">
            <WandSparkles size={16} aria-hidden="true" />
            Make your own
          </Link>
        </Window>
      </main>
    );
  }

  return (
    <main className="page share" id="main">
      <Window
        title={edit ? `${edit.title}.png` : "loading.png"}
        className="share__window"
        bodyClassName="share__body"
        status={
          edit ? (
            <>
              <span>
                {presetLabel(edit.preset)} · {new Date(edit.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <span className="tabular">
                {edit.width} × {edit.height}
              </span>
            </>
          ) : undefined
        }
      >
        <div className="share__stage">
          {edit ? (
            <img src={image} alt={edit.title} width={edit.width} height={edit.height} />
          ) : (
            <div className="skeleton share__skeleton" aria-label="Loading" />
          )}
        </div>
      </Window>
      <div className="share__cta">
        <h1 className="share__title">{edit ? edit.title : " "}</h1>
        <p className="share__lede">Made in the browser with Y2KEDIT: presets, stickers and chrome text, no AI.</p>
        <div className="share__buttons">
          <Link to={user ? "/editor" : "/register"} className="btn btn--lg">
            <WandSparkles size={18} aria-hidden="true" />
            Make your own
          </Link>
          <button type="button" className="btn btn--chrome btn--lg" onClick={download} disabled={!edit}>
            <Download size={18} aria-hidden="true" />
            Download PNG
          </button>
        </div>
      </div>
    </main>
  );
}
