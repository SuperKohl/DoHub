<template>
  <div>
    <h1>DoHub WebUI</h1>
    <button @click="startScan">Scan starten</button>
    <button @click="startPrint">Print starten</button>
  </div>
</template>

<script setup>
const startScan = async () => {
  const res = await fetch('http://localhost:3000/scan/start', { method: 'POST' });
  const data = await res.json();
  alert(JSON.stringify(data));
};

const startPrint = async () => {
  const res = await fetch('http://localhost:3000/print/start', { method: 'POST' });
  const data = await res.json();
  alert(JSON.stringify(data));
};
</script>
