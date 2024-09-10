<script>
	import { appName } from './constants.js';
	import { Navbar, NavBrand } from 'flowbite-svelte';
	import { BuildingOutline } from 'flowbite-svelte-icons';
</script>

<Navbar class="border-b" color="primary">
	<NavBrand href="/" class="text-xl">
		<BuildingOutline class="mr-2" size="lg" />
		<h1>{appName}</h1>
	</NavBrand>
</Navbar>
