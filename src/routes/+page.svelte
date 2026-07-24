<script lang="ts">
	import { AddFeedForm, PodcastList } from '$lib/features/library';
</script>

<div class="page-container">
	<header class="page-header">
		<h1>Thư viện của bạn</h1>
	</header>

	<AddFeedForm />

	<PodcastList />
</div>

<style>
	.page-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}
	.page-header h1 {
		margin-top: 0;
		color: var(--text-1, #f3f4f6);
	}
</style>
