<script lang="ts">
	import { liveQuery } from 'dexie';
	import { db, type Track } from '$lib/core/db';
	import { player } from '$lib/features/playback/application/player.svelte';
	import { formatTimestamp } from '$lib/core/utils/time';
	import { FileAudio, Play } from 'lucide-svelte';

	// Get all tracks with sourceType = 'local'
	let localTracks = liveQuery(() => db.tracks.where('sourceType').equals('local').toArray());

	function playTrack(track: Track) {
		player.selectTrack(track);
	}
</script>

{#if $localTracks && $localTracks.length > 0}
	<div class="local-track-list">
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-lg font-semibold text-white">File Âm thanh cục bộ</h2>
		</div>

		<div class="grid grid-cols-2 md:grid-cols-6 gap-4">
			{#each $localTracks as track (track.id)}
				<div
					class="group cursor-pointer relative"
					onclick={() => playTrack(track)}
					role="button"
					tabindex="0"
					onkeydown={(e) => e.key === 'Enter' && playTrack(track)}
				>
					<div
						class="relative w-full aspect-square rounded-2xl overflow-hidden mb-3 shadow-md shadow-black/20 group-hover:shadow-indigo-500/20 transition-all duration-300 bg-slate-800 flex items-center justify-center border border-slate-700"
					>
						<FileAudio
							class="w-12 h-12 text-slate-500 group-hover:scale-110 transition-transform duration-500"
						/>

						<!-- Play Overlay -->
						<div
							class="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
						>
							<div
								class="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30"
							>
								<Play class="w-4 h-4 ml-0.5" />
							</div>
						</div>
					</div>
					<h3
						class="font-semibold text-slate-200 text-sm line-clamp-1 group-hover:text-white transition-colors"
						title={track.title}
					>
						{track.title}
					</h3>
					<p class="text-xs text-slate-500 mt-1 line-clamp-1">
						{formatTimestamp(track.duration)} • {track.fileSize
							? Math.round(track.fileSize / (1024 * 1024))
							: 0}MB
					</p>
				</div>
			{/each}
		</div>
	</div>
{/if}
