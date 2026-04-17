import { useParams } from "react-router-dom";

export default function PlayPage() {
  const { chapterCode } = useParams();

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 p-6">
        <h1 className="text-2xl font-semibold">Play Runtime</h1>
        <p className="mt-2 text-sm text-white/70">
          chapterCode: {chapterCode}
        </p>

        <section className="mt-6 rounded-xl border border-white/10 p-4">
          <p className="text-sm text-white/80">
            여기에 브라우저/개발자도구/터미널 장면이 들어갈 예정입니다.
          </p>
        </section>
      </div>
    </main>
  );
}
