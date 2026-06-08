"use strict";

let selectedViewUnit = document.getElementById('viewUnit');
let todayBtn = document.getElementById('todayBtn');
let path = window.location.pathname;
let chart = null;
let chartData = null;
let today = new Date();
today.setHours(0, 0, 0, 0);
window.onload = init;

document.addEventListener('DOMContentLoaded', function () {


    if (path.toLowerCase().includes('/admin/assignments')) {

        // Lyssna på ändringar i tidsenhet och uppdatera diagrammet dynamiskt
        selectedViewUnit.addEventListener('change', () => {

            if (!chart || !chartData) {
                console.log("Diagrammet eller datan är inte redo ännu.");
                return;
            }

            let rawUnit = selectedViewUnit.value.toLowerCase();

            chart.gantt.set('durationUnit', rawUnit);

            chart.gantt.xAxis.set("baseInterval", { timeUnit: rawUnit, count: 1 });

            let series = chart.gantt.series.list[0];

            if (series) {
                // Uppdatera datan och se till att alla fält hänger med!
                series.data.setAll(
                    chartData.map(d => ({
                        start: getAdjustedStart(d.startDate, rawUnit),
                        duration: changeDuration(d.startDate, d.endDate, rawUnit),
                        id: d.id,
                        realStart: d.startDate,
                        realEnd: d.endDate,
                        projectName: d.projectName,
                        customerName: d.customerName,
                        consultants: d.consultants.map(c => `${c.FirstName} ${c.LastName}`).join(' - ')
                    })));

                series.columns.template.set("tooltipText", "[bold]{projectName} - {customerName}[/]\nPeriod: {realStart.formatDate('yyyy-MM-dd')} - {realEnd.formatDate('yyyy-MM-dd')}")
            }     

        });

        // Eventlyssnare för "Today"-knappen som scrollar till dagens datum i diagrammet
        todayBtn.addEventListener('click', () => {
            if (!chart) {
                console.log("Chart is not uploaded");
                return;
            }
            scrollToToday();
        });

    }

});
function init() {
    getData();
}


function getData() {
    // Ajax-anrop för att hämta all projektrelaterad data som behövs både för Gantt-diagrammet och för att lista expiring contracts på dashboarden
    $.ajax({
        url: "/Admin/GetAllProjects",
        method: "GET",
        dataType: "json",
        success: function (data) {

            if (path.toLowerCase().includes('/admin/assignments')) {

                chartData = data.map(project => {

                    if (!project.StartDate || !project.EndDate) {
                        console.log("Saknar datum:", project.ProjectName);
                        return null;
                    }

                    return {
                        projectName: project.ProjectName,
                        id: project.ProjectID,
                        customerName: project.CustomerName,
                        consultants: project.Consultant,
                        startDate: parseNetDate(project.StartDate),
                        endDate: parseNetDate(project.EndDate)
                    }

                }).filter(p => p !== null).sort((a, b) => a.endDate - b.endDate);
                chart = createChart(data);

               
            }

            if (path.toLowerCase().includes('/admin/dashboard')) {
                printExpringContracts(data);
            }
            
        },
        error: function (error) {
            console.log("Error :", error);

        }
    });
}


/**
 * ---------------------------------------
 * This demo was created using amCharts 5.
 * 
 * For more information visit:
 * https://www.amcharts.com/
 * 
 * Documentation is available at:
 * https://www.amcharts.com/docs/v5/
 * ---------------------------------------
 */

// Create root element
// https://www.amcharts.com/docs/v5/getting-started/#Root_element

function createChart(projects) {

    var root = am5.Root.new("chartdiv");

    
    let selectedUnit = selectedViewUnit.value.toLowerCase();

    
    // Skapa Gantt-diagram
    var gantt = root.container.children.push(am5gantt.Gantt.new(root, {
        editable: false,
        durationUnit: selectedUnit,
        weekends: [0, 6],
        excludeWeekends: false,
        snapThreshold: 0.3,
        sidebarWidth: 200,
        start: today.getTime()
    }));

    // Sätt xAxis att börja på dagens datum och inte tillåta att scrolla längre bakåt i tiden
    gantt.xAxis.setAll({
        min: today.getTime(),
        extraMin: 0
    });

    // Cellplacering och höjd på yAxis
    gantt.yAxis.get("renderer").setAll({
        cellStartLocation: 0.1,
        cellEndLocation: 0.9,
        variableHeight: true
    });

    // Sätt min och max höjd på celler i yAxis
    gantt.yAxis.setAll({
        minCellHeight: 10,
        maxCellHeight: 30,
        fixAxisSize: false
    });

    // Skapa en range för dagens datum
    let rangeDateItem = gantt.xAxis.makeDataItem({
        value: today.getTime(),
        above: true
    });
    // Skapa range på xAxis baserat på dataitem
    let range = gantt.xAxis.createAxisRange(rangeDateItem);

    // Styla dagensdatum range
    range.get('grid').setAll({
        stroke: am5.color(0xff0000),
        strokeWidth: 4,
        strokeOpacity: 1,
        visible: true,
        location: 0,
        isMeasured: false,
        height: am5.percent(100),
        forceHidden: false,
        strokeDasharray: []
    });

    // Style the dagensdatum etikett
    range.get('label').setAll({
        text: 'Today',
        fill: am5.color(0xff0000),
        above: true,
        visible: true,
        dy: 20
    });

    // Nulla tidigare tidsenhet för att undvika onödiga uppdateringar
    let previousTimeUnit = null;

    // Lyssna på ändringar i tidsenhet och uppdatera axlar och scrollbar dynamiskt
    gantt.xAxis.on('baseInterval', (val) => {

        if (val.timeUnit === previousTimeUnit) return;
        previousTimeUnit = val.timeUnit;

        // 
        if (val.timeUnit === 'day') {

            // Tvinga primäraxeln att alltid visa veckor
            gantt.xAxis.set('gridIntervals', [
                { timeUnit: 'week', count: 1 }
            ]);

            gantt.xAxis.setAll({
                dateFormats: {
                    week: "'W'w - MMM / yyyy"
                },
                periodChangeDateFormats: {
                    week: "'W'w - MMM / yyyy"
                },
                min: today.getTime(),
                max: today.getTime() + 350 * 24 * 60 * 60 * 1000,
                strictMinMax: true,
                extraMin: 0
            });

            // Sekundäraxeln visar dagar
            gantt.xAxisMinor.set('gridIntervals', [
                { timeUnit: 'day', count: 1 }
            ]);
            gantt.xAxisMinor.setAll({
                dateFormats: {
                    day: "eee dd"
                },
                periodChangeDateFormats: {
                    day: "eee dd"
                }
            });

            gantt.scrollbarX.setAll({
                start: 0,
                end: 0.03
            });
        }

        if (val.timeUnit === 'week') {

            gantt.xAxis.set('gridIntervals', [
                { timeUnit: 'month', count: 1 }
            ]);

            gantt.xAxis.setAll({
                dateFormats: {
                    month: "MMM / yyyy"
                },
                periodChangeDateFormats: {
                    month: "MMM / yyyy"
                },
                min: today.getTime(),
                max: today.getTime() + 350 * 24 * 60 * 60 * 1000,
                strictMinMax: true,
                extraMin: 0
            });


            // Sekundäraxeln visar dagar
            gantt.xAxisMinor.set('gridIntervals', [
                { timeUnit: 'week', count: 1 }
            ]);

            gantt.xAxisMinor.get('renderer').set('minGridDistance', 60);

            gantt.xAxisMinor.setAll({
                dateFormats: {
                    week: "'W'w"
                },
                periodChangeDateFormats: {
                    week: "'W'w"
                }
            });

            gantt.xAxisMinor.get('renderer').setAll({
                minGridDistance: 20
            });

            gantt.scrollbarX.setAll({
                start: 0,
                end: 0.6
            });

            
        }

        if (val.timeUnit === 'month') {


            gantt.xAxis.set('gridIntervals', [
                { timeUnit: 'year', count: 1 }
            ]);

            gantt.xAxis.setAll({
                dateFormats: {
                    year: "yyyy"
                },
                periodChangeDateFormats: {
                    year: "yyyy"
                },
                min: today.getTime(),
                max: today.getTime() + 20000 * 24 * 60 * 60 * 1000,
                strictMinMax: true,
                extraMin: 0
            });


            // Sekundäraxeln visar dagar
            gantt.xAxisMinor.set('gridIntervals', [
                { timeUnit: 'month', count: 1 }
            ]);

            gantt.xAxisMinor.get('renderer').set('minGridDistance', 1);

            gantt.xAxisMinor.setAll({
                dateFormats: {
                    month: "MMM"
                },
                periodChangeDateFormats: {
                    month: "MMM"
                }
            });

            gantt.xAxisMinor.get('renderer').setAll({
                minGridDistance: 20
            });

            gantt.scrollbarX.setAll({
                start: 0,
                end: 0.05
            });
        }
    });

    
    // Dölj horisontell scrollbar
    gantt.scrollbarX.set('visible', false);

    // Mappa om projekten till det format som Gantt-diagrammet kräver
    let data = projects.map(project => ({
            projectName: project.ProjectName,
            id: project.ProjectID,
            customerName: project.CustomerName,
            consultants: project.Consultant,
            startDate: parseNetDate(project.StartDate),
            endDate: parseNetDate(project.EndDate)
    }));

    // Visa diagrammets redigeringsverktyg för att kunna visa rubriken över uppdr
    gantt.controls.set('visible', true);

    // Radera redigeringsverktyg för att skriva rubrik över uppdragsdata
    gantt.controls.children.clear();

    // Rubrik över uppdragsdata
    gantt.controls.children.push(
        am5.Label.new(root, {
            text: "Project / Customer",
            fontWeight: 600,
            fontFamily: "Poppins",
            fontSize: 12,
            fill: am5.color(0x000000),
            paddingLeft: 20,
            centerY: am5.percent(50),
            y: am5.percent(50),
            x: 0,
        })
    );

    gantt.yAxis.get('renderer').labels.template.setAll({
        oversizedBehavior: "wrap",
        breakWords: true,
        maxWidth: 190,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "Poppins",
        paddingTop: 0.5,
        paddingBottom: 0.5,
        paddingLeft: 5,
        paddingRight: 3
    });

    let sortedDataByEnddate = data.sort((a, b) => {
        let enddateA = a.endDate;
        let enddateB = b.endDate;

        return (enddateA > enddateB) ? 1 : -1
    });

    // Sätt uppdragsnamn och kundsnamn på yAxis 
    gantt.yAxis.data.setAll([
        ...sortedDataByEnddate.map(d => ({
            name: `${d.projectName} /\n ${d.customerName}`,
            id: d.id
        }))
    ]);
   
    // Sätt uppdragsdata på Gantt-serien, inklusive justering av startdatum och duration baserat på den valda tidsenheten
    gantt.series.data.setAll([
        ...sortedDataByEnddate.map(d => ({
            start: getAdjustedStart(d.startDate, selectedUnit),
            duration: changeDuration(d.startDate, d.endDate, selectedUnit),
            progress: 1,
            id: d.id,
            realStart: d.startDate,
            realEnd: d.endDate,
            consultants: d.consultants.map(c => `${c.FirstName} ${c.LastName}`).join(' - '),
            fillColor: am5.color(0x6995ba),
            strokeColor: am5.color(0x6995ba)
        }))
     ]);

    // Dölj progress-cirklar
    gantt.yAxis.get("renderer").progressPies.template.setAll({
        visible: false
    });

    // Dölj antal av dagar på varje stapel
    gantt.yAxis.get("renderer").durationSteppers.template.setAll({
        forceHidden: true
    });

    // Styla axlar
    gantt.xAxis.get('renderer').grid.template.setAll({
        stroke: am5.color(0x000000),
        strokeWidth: 1,
        strokeOpacity: 1
    });

    // Styla xAxis labels
    gantt.xAxis.get('renderer').labels.template.setAll({
        strokeOpacity: 1,
        fill: am5.color(0x000000)
    });

    // Styla sekundäraxeln
    gantt.xAxisMinor.get('renderer').grid.template.setAll({
        stroke: am5.color(0x000000),
        strokeWidth: 1,
        strokeOpacity: 1,
        fill: am5.color(0x000000)
    });

    // Styla yAxis
    gantt.yAxis.get("renderer").grid.template.setAll({
        stroke: am5.color(0x000000),
        strokeWidth: 1,
        strokeOpacity: 1
    });

    
    gantt.series.set("tooltip", undefined);

    // Skapa en anpassad tooltip som inte är bunden till datapunten
    let customTooltip = am5.Tooltip.new(root, {
        getPointFromData: false,
        pointerOrientation: "vertical" 
    });

    // Styla staplarna och koppla den anpassade tooltipen som visas när musen hovrar över en stapel
    gantt.series.columns.template.setAll({
        fill: am5.color(0x4a90d9),
        stroke: am5.color(0x6995ba),
        strokeWidth: 2,
        height: am5.percent(90),
        cellHeight: 50,
        showProgress: false,
        tooltipText: "[bold]{consultants}[/]\nPeriod: {realStart.formatDate('yyyy-MM-dd')} - {realEnd.formatDate('yyyy-MM-dd')}",
        tooltip: customTooltip,
    });

    // Dölj on/off knappen för att visa/dölja serier
    gantt.fitButton.set('visible', false);

    // Dölj zoom-knappar
    gantt.zoomOutButton.set('visible', false);
 
    // Dynamiskt anpassa höjden på diagrammet baserat på antal uppdrag
    let dynamicHeight = 50 + (gantt.yAxis.data.length * 55); 

    // Sätt en maxhöjd för att undvika att diagrammet blir för högt
    root.dom.style.height = dynamicHeight + "px";

    gantt.appear(0);
    

    return { root, gantt };
}

// Justera startdatum för att passa den valda tidsenheten (dag, vecka, månad)
function getAdjustedStart(startDateMs, unit) {
    let date = new Date(startDateMs);
    date.setHours(0, 0, 0, 0);

    if (unit === 'week') {
        let day = date.getDay();

        let diff = date.getDate() - day + (day === 0 ? -6 : 1);
        date.setDate(diff);
    }
    else if (unit === 'month') {
        date.setDate(1);
    }
    return date.getTime();
}

// Räkna ut duration baserat på start- och slutdatum och den valda tidsenheten
function changeDuration(startDateMs, endDateMs, unit) {

    let adjustedStart = getAdjustedStart(startDateMs, unit);
    let totalMs = endDateMs - adjustedStart;
    let days = Math.round(totalMs / (1000 * 60 * 60 * 24));

    if (days <= 0) days = 1;

    switch (unit) {
        case 'day':
            return days;
        case 'week':
            return days / 7;
        case 'month':
            let s = new Date(adjustedStart);
            let e = new Date(endDateMs);
            // Räkna ut exakt antal kalendermånader emellan
            let months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());

            // Räkna ut resterande dagar som en procentuell andel av den sista månaden
            let daysInEndMonth = new Date(e.getFullYear(), e.getMonth() + 1, 0).getDate();
            let fraction = (e.getDate() - s.getDate()) / daysInEndMonth;

            return months + fraction;
        case 'year':
            return days / 365.25;
           default:
            return days;
    }

}

// Scrolla till dagens datum när "Today"-knappen klickas
function scrollToToday() {
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    let min = chart.gantt.xAxis.getPrivate('min');
    let max = chart.gantt.xAxis.getPrivate('max');

    if (!min || !max) {
        console.log("min/max missing");
    }

    let totalSpan = max - min;

    let currentStart = chart.gantt.scrollbarX.get('start');
    let currentEnd = chart.gantt.scrollbarX.get('end');
    let visibleSpan = currentEnd - currentStart;

    // Center on todays date
    let todayPosition = (today.getTime() - min) / totalSpan;
    let newStart = todayPosition - visibleSpan / 10;
    let newEnd = todayPosition + visibleSpan / 2;

    
    if (newStart < 0) {
        newStart = 0;
        newEnd = visibleSpan;
    }
    if (newEnd > 1) {
        newEnd = 1;
        newStart = 1 - visibleSpan;
    }

    chart.gantt.scrollbarX.setAll({
        start: newStart,
        end: newEnd
    });
    
}

// Lista expiring contracts på dashboarden
function printExpringContracts(data) {
    let expiringContracts = document.getElementById('expiring-contracts-table');

    let sortedDataByEnddate = data.sort((a, b) => {
        let enddateA = new Date(parseNetDate(a.EndDate))
        let enddateB = new Date(parseNetDate(b.EndDate))

        return (enddateA > enddateB) ? 1 : -1;
    });

    sortedDataByEnddate.forEach(project => {
        let endDate = new Date(parseNetDate(project.EndDate));
        let today = new Date().getTime();
        let sixMonthsFromNow = today + (6 * 30 * 24 * 60 * 60 * 1000);

        if (endDate < sixMonthsFromNow) {
            let tableRow = document.createElement('tr');

            let projectData = document.createElement('td');
            projectData.textContent = project.ProjectName;

            let costumerData = document.createElement('td');
            costumerData.textContent = project.CustomerName;

            let consultantData = document.createElement('td');
            consultantData.textContent = project.Consultant.map(c => `${c.FirstName} ${c.LastName}`).join(' - ');

            let enddateData = document.createElement('td');
            enddateData.textContent = endDate.toLocaleDateString();

            tableRow.appendChild(projectData);
            tableRow.appendChild(costumerData);
            tableRow.appendChild(consultantData);
            tableRow.appendChild(enddateData);

            expiringContracts.appendChild(tableRow);
        } 
    })
}

// Parsar .NET-formatet av datum som kommer från backend och returnerar millisekunder
function parseNetDate(dateString) {
    if (!dateString) return null;

    let ms = parseInt(dateString.replace('/Date(', '').replace(')/', ''));

    return ms;
}

