<script>
	import { appName } from './constants.js';
	import { Navbar, NavBrand } from 'flowbite-svelte';
</script>

<Navbar class="border-b" color="primary">
	<NavBrand href="/" class="text-xl">
		<h1>{appName}</h1>
	</NavBrand>
</Navbar>
