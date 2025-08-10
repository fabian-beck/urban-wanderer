<script>
	import { appName } from '../constants.js';
	import { Navbar, NavBrand, NavHamburger, NavUl, NavLi } from 'flowbite-svelte';
	import UserPreferences from './UserPreferences.svelte';

	export let updateRandom;
	let preferencesVisible = false;
	let hideNavUl = true;
</script>

<Navbar class="fixed border-b" color="primary">
	<NavBrand href="/" class="uw-font text-2xl">
		<h1 class="ml-2">{appName}</h1>
	</NavBrand>
	<NavHamburger
		onClick={() => {
			hideNavUl = !hideNavUl;
		}}
	/>
	<NavUl hidden={hideNavUl} classUl="bg-white" slideParams={{ duration: 150, delay: 0 }}>
		<NavLi
			class="bg-white"
			on:click={() => {
				preferencesVisible = true;
				hideNavUl = true;
			}}
		>
			Preferences</NavLi
		>
		<NavLi
			class="bg-white"
			on:click={() => {
				hideNavUl = true;
				updateRandom();
			}}>Travel to random place</NavLi
		>
	</NavUl>
</Navbar>

<UserPreferences bind:visible={preferencesVisible} />

