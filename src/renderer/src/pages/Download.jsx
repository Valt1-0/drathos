import { useDownload } from "../contexts/downloadContext";

const Download = () => {
  const { downloads } = useDownload();

  const totalSpeed = downloads
    .filter((d) => d.stage !== "Completed")
    .reduce((sum, d) => sum + (d.speed || 0), 0);

  return (
    <div className="min-h-screen bg-[#1b2838] text-white p-8 flex flex-col space-y-8">
      <div className="flex justify-between items-center border-b border-gray-700 pb-4">
        <h1 className="text-3xl font-bold">Téléchargements</h1>
        <div className="text-sm text-gray-400">
          Vitesse: {totalSpeed.toFixed(1)} MB/s • Espace libre: 124 GB
        </div>
      </div>

      <div className="space-y-6">
        {downloads.map((dl) => (
          <div
            key={dl.id}
            className="bg-[#2a475e] rounded-xl shadow-lg p-4 flex items-center space-x-6"
          >
            <div className="w-32 h-20 bg-gray-700 rounded overflow-hidden">
              <img
                src={dl.image}
                alt="cover"
                className="object-cover w-full h-full"
              />
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-semibold">{dl.name}</h2>
              <div className="text-sm text-gray-300 mb-2">
                {dl.stage}... {dl.progress}%
              </div>

              <div className="w-full bg-gray-800 h-3 rounded overflow-hidden">
                <div
                  className="bg-green-500 h-full transition-all duration-300"
                  style={{ width: `${dl.progress}%` }}
                ></div>
              </div>
            </div>

            <div className="w-32 text-right text-sm text-gray-300">
              {dl.stage === "Completed"
                ? "Installé"
                : `${dl.speed.toFixed(1)} MB/s`}
              <br />
              {dl.sizeDownloaded.toFixed(1)} GB / {dl.totalSize} GB
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-6 border-t border-gray-700 text-sm text-gray-400">
        Les téléchargements continuent même si vous quittez cette page.
      </div>
    </div>
  );
};

export default Download;
