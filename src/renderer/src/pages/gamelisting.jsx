import { Icon } from "@iconify/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function GameLibraryListing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex h-screen">
        <div className="w-80 bg-slate-800/50 border-r border-slate-700 p-6 overflow-y-auto">
          <div className="mb-8">
            <h1 className="font-heading text-3xl text-white mb-2">Game Library</h1>
            <p className="text-slate-400">Browse your collection</p>
          </div>
          <div className="space-y-2">
            <div className="p-4 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 hover:border-slate-500 transition-all cursor-pointer group">
              <h3 className="text-white font-semibold group-hover:text-blue-400 transition-colors">
                Cyberpunk 2077
              </h3>
              <p className="text-slate-400 text-sm">CD Projekt Red</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 hover:border-slate-500 transition-all cursor-pointer group">
              <h3 className="text-white font-semibold group-hover:text-blue-400 transition-colors">
                The Witcher 3: Wild Hunt
              </h3>
              <p className="text-slate-400 text-sm">CD Projekt Red</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 hover:border-slate-500 transition-all cursor-pointer group">
              <h3 className="text-white font-semibold group-hover:text-blue-400 transition-colors">
                Red Dead Redemption 2
              </h3>
              <p className="text-slate-400 text-sm">Rockstar Games</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 hover:border-slate-500 transition-all cursor-pointer group">
              <h3 className="text-white font-semibold group-hover:text-blue-400 transition-colors">
                Elden Ring
              </h3>
              <p className="text-slate-400 text-sm">FromSoftware</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 hover:border-slate-500 transition-all cursor-pointer group">
              <h3 className="text-white font-semibold group-hover:text-blue-400 transition-colors">
                God of War
              </h3>
              <p className="text-slate-400 text-sm">Santa Monica Studio</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 hover:border-slate-500 transition-all cursor-pointer group">
              <h3 className="text-white font-semibold group-hover:text-blue-400 transition-colors">
                Horizon Zero Dawn
              </h3>
              <p className="text-slate-400 text-sm">Guerrilla Games</p>
            </div>
          </div>
        </div>
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="relative mb-8 rounded-2xl overflow-hidden h-96">
              <img
                alt="Cyberpunk 2077"
                src="https://wqnmyfkavrotpmupbtou.supabase.co/storage/v1/object/public/reweb/blocks/placeholder.png"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <h1 className="font-heading text-4xl text-white mb-2">Cyberpunk 2077</h1>
                <p className="text-slate-300 text-lg">CD Projekt Red • 2020</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700">
                  <h2 className="font-heading text-xl text-white mb-4">About This Game</h2>
                  <p className="text-slate-300 leading-relaxed">
                    Cyberpunk 2077 is an open-world, action-adventure RPG set in the dark future of
                    Night City — a dangerous megalopolis obsessed with power, glamour, and ceaseless
                    body modification. You play as V, a mercenary outlaw going after a one-of-a-kind
                    implant that is the key to immortality.
                  </p>
                </div>
                <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700">
                  <h2 className="font-heading text-xl text-white mb-4">Screenshots</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <img
                      alt="Screenshot 1"
                      src="https://wqnmyfkavrotpmupbtou.supabase.co/storage/v1/object/public/reweb/blocks/placeholder.png"
                      className="rounded-lg border border-slate-600"
                    />
                    <img
                      alt="Screenshot 2"
                      src="https://wqnmyfkavrotpmupbtou.supabase.co/storage/v1/object/public/reweb/blocks/placeholder.png"
                      className="rounded-lg border border-slate-600"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700">
                  <h3 className="font-semibold text-white mb-4">Game Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Hours Played</span>
                      <span className="text-white font-medium">78 hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Rating</span>
                      <div className="flex items-center gap-1">
                        <Icon icon="mdi:star" className="w-4 h-4 text-yellow-400" />
                        <span className="text-white font-medium">4.8</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Genre</span>
                      <Badge
                        variant="secondary"
                        className="bg-blue-900/30 text-blue-300 border-blue-700"
                      >
                        RPG
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700">
                  <Button className="w-full mb-3 bg-blue-600 hover:bg-blue-700 text-white">
                    <Icon icon="mdi:play" className="w-4 h-4 mr-2" />
                    Play Game
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Icon icon="mdi:download" className="w-4 h-4 mr-2" />
                    Install
                  </Button>
                </div>
                <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700">
                  <h3 className="font-semibold text-white mb-4">Recent Achievements</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-yellow-600/20 rounded border border-yellow-600/30 flex items-center justify-center">
                        <Icon icon="mdi:trophy" className="w-4 h-4 text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">Street Kid</p>
                        <p className="text-slate-400 text-xs">Complete the prologue</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-600/20 rounded border border-purple-600/30 flex items-center justify-center">
                        <Icon icon="mdi:trophy" className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">Netrunner</p>
                        <p className="text-slate-400 text-xs">Hack 50 devices</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
