<script>
	import { appName } from '../constants/core.js';
	import Button from 'flowbite-svelte/Button.svelte';
	import Input from 'flowbite-svelte/Input.svelte';
	import Label from 'flowbite-svelte/Label.svelte';
	import Modal from 'flowbite-svelte/Modal.svelte';
	import NavBrand from 'flowbite-svelte/NavBrand.svelte';
	import NavHamburger from 'flowbite-svelte/NavHamburger.svelte';
	import NavLi from 'flowbite-svelte/NavLi.svelte';
	import Navbar from 'flowbite-svelte/Navbar.svelte';
	import NavUl from 'flowbite-svelte/NavUl.svelte';
	import UserPreferences from './UserPreferences.svelte';

	export let updateRandom;
	export let searchForPlace;
	let preferencesVisible = false;
	let hideNavUl = true;
	let searchModalVisible = false;
	let searchQuery = '';

	const handleSearch = () => {
		if (searchQuery.trim()) {
			searchForPlace(searchQuery.trim());
			searchModalVisible = false;
			searchQuery = '';
		}
	};
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
		<NavLi
			class="bg-white"
			on:click={() => {
				hideNavUl = true;
				searchModalVisible = true;
			}}>Search for place</NavLi
		>
	</NavUl>
</Navbar>

<UserPreferences bind:visible={preferencesVisible} />

<Modal bind:open={searchModalVisible} title="Search for Place" outsideclose>
	<form on:submit|preventDefault={handleSearch}>
		<div class="mb-4">
			<Label for="search-input" class="mb-2">Place name</Label>
			<Input
				id="search-input"
				bind:value={searchQuery}
				placeholder="Enter place name..."
				autofocus
			/>
		</div>
		<div class="flex justify-end space-x-2">
			<Button
				color="alternative"
				on:click={() => {
					searchModalVisible = false;
					searchQuery = '';
				}}
			>
				Cancel
			</Button>
			<Button type="submit" disabled={!searchQuery.trim()}>Search</Button>
		</div>
	</form>
</Modal>
