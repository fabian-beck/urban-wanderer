<script>
	import { appName } from './constants.js';
	import { Navbar, NavBrand, NavHamburger, NavUl, NavLi } from 'flowbite-svelte';
	import UserPreferences from './UserPreferences.svelte';

	let preferencesVisible = false;
	let hideNavUl = true;
</script>

<Navbar class="fixed border-b" color="form">
	<NavBrand href="/" class="text-xl text-primary-800">
		<h1>{appName}</h1>
	</NavBrand>
	<NavHamburger
		onClick={() => {
			hideNavUl = !hideNavUl;
		}}
	/>
	<NavUl hidden={hideNavUl}>
		<NavLi
			on:click={() => {
				preferencesVisible = true;
				hideNavUl = true;
			}}>Preferences</NavLi
		>
	</NavUl>
</Navbar>

<UserPreferences bind:visible={preferencesVisible} />
