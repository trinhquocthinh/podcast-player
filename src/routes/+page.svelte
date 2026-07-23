<script lang="ts">
	import EmptyState from '$lib/core/ui/EmptyState.svelte';
</script>

<div class="page-container">
	<header class="page-header">
		<h1>Thư viện của bạn</h1>
	</header>

	<EmptyState
		title="Chưa có Podcast nào"
		description="Hãy thêm podcast yêu thích bằng cách nhập RSS Feed hoặc tìm kiếm trên Apple Podcast."
		actionText="Thêm Podcast"
		onaction={() => {}}
	/>
</div>
