var interval = null;
var running = false;

class Process {
    constructor(id, creationCycle, cpuNeeded, ioStart, ioNeeded) {
        this.id = id;
        this.creationCycle = creationCycle;
        this.cpuNeeded = cpuNeeded;
        this.ioStart = ioStart;
        this.ioNeeded = ioNeeded;
        this.finished = false;
        this.ioUsed = 0;
        this.finishedCycle = '---';
        this.timeInSystem = 0;
    }
}

class PCB {
    constructor() {
        this.processes = [];
    }

    fillPCBTable() {
        var rowTemplate = '<tr><td>{0}</td><td>{1}</td><td>{2}</td><td>{3}</td><td>{4}</td><td>{5}</td><td>{6}</td><td>{7}</td><td>{8}</td></tr>';
        $('#pcb-table tr').remove();
        processes.forEach(function(p) {
            $('#pcb-table').html($('#pcb-table').html() + rowTemplate.format(p.id, p.creationCycle, p.cpuNeeded, p.ioStart, p.ioNeeded, p.ioUsed, p.finishedCycle, p.timeInSystem));
        });
    }
}

var pcb = new PCB();

$('#new-process-probability-slider').slider({
    precission: 0,
    value: 50
});

$('#quantum-slider').slider({
    precission: 0,
    value: 5
});

$('#delay-slider').slider({
    precission: 2,
    value: 0.2,
    step: 0.01
});

$('#cores-slider').slider({
    precission: 0,
    value: 4
});

$('#new-limit-slider').slider({
    precission: 0,
    value: 50
});

$('#ready-limit-slider').slider({
    precission: 0,
    value: 50
});

$('#waiting-limit-slider').slider({
    precission: 0,
    value: 50
});

$('#new-limit-slider').slider('disable');
$('#ready-limit-slider').slider('disable');
$('#waiting-limit-slider').slider('disable');

$('#cpu-slider').slider({});

$('#io-slider').slider({});

$('#round-robin-radio').prop('checked', true);
$('#pause-badge').parent().hide();

$('#list-limits-checkbox').change(function() {
    if(this.checked) {
    $('#new-limit-slider').slider('enable');
    $('#ready-limit-slider').slider('enable');
    $('#waiting-limit-slider').slider('enable');
    } else {
    $('#new-limit-slider').slider('disable');
    $('#ready-limit-slider').slider('disable');
    $('#waiting-limit-slider').slider('disable');
    }
});

$('#delay-slider').on('slide', function(e) {
    if(running) {
        clearInterval(interval);
        interval = setInterval(cycle, e.value * 1000);
    }
});

$('#play-badge').on('click', function() {
    $('#pause-badge').parent().show();
    $('#play-badge').parent().hide();
    running = true;
    interval = setInterval(cycle, 200);
});

$('#pause-badge').on('click', function() {
    $('#play-badge').parent().show();
    $('#pause-badge').parent().hide();
    running = false;
    clearInterval(interval);
});

$('#stop-badge').on('click', function() {
    $('#play-badge').parent().show();
    $('#pause-badge').parent().hide();
    running = false;
    clearInterval(interval);
});

pcb.processes.push(new Process('P01', 0, 10, 3, 5));

function cycle() {
    pcb.fillPCBTable();
}
