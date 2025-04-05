let offset = 0;
let arr_offsets = [];

// Ініціалізація timesync
const ts = timesync.create({
    server: '/timesync',
    repeat: 0
});

// Подія синхронізації
ts.on('sync', function () {
    if (typeof ts.offset !== 'number' || isNaN(ts.offset)) {
        console.error("Помилка: timesync повернув NaN!");
        document.getElementById('syncError').innerText = `Помилка: timesync повернув NaN!`;
        return;
    }

    const error = Math.abs(offset - ts.offset);
    console.log("Похибка методу:", error);

    document.getElementById('syncError').innerText = `Похибка методу: ${error.toFixed(2)} мс`;
});

// Отримання статистики
function fetchData() {
    try {
        const stats = calculateStats(arr_offsets);
        document.getElementById('output').innerText = formatStats(stats);
    } catch (error) {
        document.getElementById('output').innerText = 'Помилка отримання даних';
        console.error('Помилка:', error);
    }
}

// Функція для синхронізації часу
async function syncTime() {
    try {
        const start = performance.now();
        const response = await fetch('/time', { method: 'GET' });
        const end = performance.now();

        if (!response.ok) throw new Error(`HTTP помилка: ${response.status}`);

        const { result: serverTime } = await response.json();
        const roundTripTime = end - start;
        const estimatedClientTime = serverTime + roundTripTime / 2;
        offset = estimatedClientTime - Date.now();

        if (arr_offsets.length > 30) arr_offsets = [];
        arr_offsets.push(offset);

        ts.sync();

        document.getElementById('timeOutput').innerText = `Поправка часу: ${offset.toFixed(2)} мс`;
        console.log("Поправка часу (метод 1):", offset);
        document.getElementById('output').innerText = formatStats(calculateStats(arr_offsets));

        await new Promise(resolve => setTimeout(resolve, 1000));
        syncTime();
    } catch (error) {
        document.getElementById('timeOutput').innerText = 'Помилка синхронізації';
        console.error('Помилка:', error);
    }
}

// Обчислення статистичних показників
function calculateStats(arr) {
    if (!arr.length) return {};

    arr.sort((a, b) => a - b);
    const min = arr[0];
    const max = arr[arr.length - 1];
    const avg = arr.reduce((sum, num) => sum + num, 0) / arr.length;
    const median = arr.length % 2 === 0 ?
        (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2 :
        arr[Math.floor(arr.length / 2)];
    const q1 = arr[Math.floor(arr.length * 0.25)];
    const q3 = arr[Math.floor(arr.length * 0.75)];
    const iqr = q3 - q1;
    const mode = findMode(arr);
    const variance = arr.reduce((sum, num) => sum + (num - avg) ** 2, 0) / arr.length;
    const stddev = Math.sqrt(variance);

    return { min, q1, median, q3, max, avg, mode, stddev, iqr };
}

// Пошук моди (найчастішого значення)
function findMode(arr) {
    const freq = {};
    arr.forEach(num => freq[num] = (freq[num] || 0) + 1);
    let maxFreq = 0, mode = null;

    for (const num in freq) {
        if (freq[num] > maxFreq) {
            maxFreq = freq[num];
            mode = Number(num);
        }
    }
    return mode;
}

// Форматування статистики для виводу
function formatStats(stats) {
    return `Кількість спостережень: ${arr_offsets.length}
Поправка: ${offset.toFixed(2)} мс
Min: ${stats.min.toFixed(2)} мс
Q1: ${stats.q1.toFixed(2)} мс
Медіана: ${stats.median.toFixed(2)} мс
Середнє: ${stats.avg.toFixed(2)} мс
Мода: ${stats.mode.toFixed(2)} мс
Q3: ${stats.q3.toFixed(2)} мс
Max: ${stats.max.toFixed(2)} мс
Стандартне відхилення: ${stats.stddev.toFixed(2)} мс
IQR: ${stats.iqr.toFixed(2)} мс`;
}
