<script setup>
import { ref, onMounted } from 'vue';
import { Chart, Title, Tooltip, Legend, BarElement, LineElement, PointElement, LineController, CategoryScale, LinearScale, PieController, ArcElement } from 'chart.js';
Chart.register(Title, Tooltip, Legend, LineElement, PointElement, LineController, CategoryScale, LinearScale, PieController, ArcElement);

const sample = ref(null);
onMounted(() => {
    if (sample.value) {
        const ctx = sample.value.getContext('2d');
        new Chart(ctx, {
            type: 'doughnut', // 円グラフを使用
            data: {
                labels: ["a","b","c","d","e"],
                datasets: [{
                    backgroundColor: ["red","orange","yellow","green","blue"],
                    data: ["30","20","30","40","50"],
                    borderWidth: 1
                }],
            },
            options: {
                cutout: '70%',
                plugins: {
                    legend: {
                        display: false
                    },
                    borderWidth: 0
                }
            }
        });
    }
});

</script>

<template>
    <div class="h-[100px] w-[100px] p-10">
        <div class="h-[100px] w-[100px]">
            <canvas ref="sample" style="width: 100%; height: 100%;" />
        </div>
    </div>
</template>

