// components/InstagramStoryLayout.js
export default function InstagramStoryLayout({ flower }) {
  return (
    <div
      className="w-[1080px] h-[1920px] bg-gradient-to-br from-pink-100 to-purple-100 flex flex-col items-center justify-center text-center font-sans text-purple-900 relative px-10"
      style={{ fontFamily: 'sans-serif' }}
    >
      <h1 className="text-4xl font-bold mb-4">🌸 {flower?.name || 'A Bloom of Emotion'}</h1>
      <p className="italic text-lg max-w-[800px]">“{flower?.note || 'Your feeling in full bloom'}”</p>

      <div className="mt-10">
        <img
          src={`/flowers/${flower?.type || 'default'}.png`}
          alt="Flower"
          className="w-[400px] h-[400px] object-contain mx-auto"
        />
      </div>

      <p className="text-xl mt-12">Watered {flower?.waterCount || 7} / 7 times</p>

      <div className="absolute bottom-10 text-sm text-purple-700">
        💚 Planted in Sharon’s Garden · sharons-garden.vercel.app
      </div>
    </div>
  );
}
