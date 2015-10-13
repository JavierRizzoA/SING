var interval = null;
var running = false;


class Process {
  constructor(id, creationCycle) {
    this.id = id;
    this.creationCycle = creationCycle;
    this.cpuNeeded = Math.floor(Math.random() * ($('#cpu-slider').slider('getValue')[1] - $('#cpu-slider').slider('getValue')[0] + 1) + $('#cpu-slider').slider('getValue')[0]);
    this.ioStart = Math.floor(Math.random() * (this.cpuNeeded - 3) + 3);
    this.ioNeeded = Math.floor(Math.random() * ($('#io-slider').slider('getValue')[1] - $('#io-slider').slider('getValue')[0] + 1) + $('#io-slider').slider('getValue')[0]);
    this.finished = false;
    this.ioUsed = 0;
    this.cpuUsed = 0;
    this.finishedCycle = '---';
    this.timeInSystem = 0;
    this.quantum = 0;
  }

  process() {
    this.cpuUsed++;
    this.quantum++;
    this.timeInSystem++;
  }

  useIO() {
    this.ioUsed++;
    this.timeInSystem++;
  }

  wait() {
    this.timeInSystem++;
  }
}

class List {
  constructor(display) {
    this.display = display;
    this.limit = 50000000;
    this.processes = [];
  }

  fillDisplay() {
    this.display.empty();
    var that = this;
    this.processes.forEach(function(p) {
      that.display.append("<option>" + p.id + "</option>");
    });
  }

  length() {
    return this.processes.length;
  }

  push(p) {
    this.processes.push(p);
  }

  splice(i, l) {
    this.processes.splice(i, l);
  }

  forEach(f) {
    this.processes.forEach(f);
  }

  hasSpace() {
    return this.processes.length < this.limit;
  }
}

class PCB {
  constructor() {
    this.processCount = 0;
    this.cycle = 0;

    this.lists = [];
    this.lists['new'] = new List($('#new-select'));
    this.lists['ready'] = new List($('#ready-select'));
    this.lists['waiting'] = new List($('#waiting-select'));
    this.lists['running'] = new List($('#running-select'));
    this.lists['io'] = new List($('#using-io-select'));
    this.lists['terminated'] = new List($('#terminated-select'));

    this.lists['running'].limit = 4;
    this.lists['io'].limit = 1;
  }

  tick() {
    this.cycle++;
    if(Math.random() * 100 <= $('#new-process-probability-slider').slider('getValue')) {
      //TODO Do not create when full.
      this.lists['new'].push(new Process('P' + this.processCount++, this.cycle));
    }
    var toRemove = [];
    this.lists['running'].forEach(function(p, i, list) {
      p.process();
      if(p.cpuUsed === p.cpuNeeded) {
        toRemove.push(i);
        pcb.lists['terminated'].push(p);
      } else if(p.cpuUsed == p.ioStart) {
          toRemove.push(i);
        if(pcb.lists['waiting'].hasSpace())
          pcb.lists['waiting'].push(p);
        else
          pcb.lists['terminated'].push(p);
      } else if(p.quantum == $('#quantum-slider').slider('getValue')) {
        toRemove.push(i);
        pcb.lists['ready'].push(p);
      }
    });
    toRemove.forEach(function(p, i) {
      pcb.lists['running'].splice(p - i, 1);
    });

    toRemove = [];
    this.lists['io'].forEach(function(p, i, list) {
      p.useIO();
      if(p.ioUsed === p.ioNeeded) {
        toRemove.push(i);
        if(pcb.lists['ready'].hasSpace())
          pcb.lists['ready'].push(p);
        else
          pcb.lists['terminated'].push(p);
      }
    });
    toRemove.forEach(function(p, i) {
      pcb.lists['io'].splice(p - i, 1);
    });

    toRemove = [];
    while(this.lists['io'].hasSpace() && this.lists['waiting'].length() > 0) {
      if(toRemove.length === 0) 
        toRemove.push(0); 
      else 
        toRemove.push(toRemove[toRemove.length - 1] + 1);
      this.lists['io'].push(this.lists['waiting'].processes[toRemove[toRemove.length - 1]]);
    }
    toRemove.forEach(function(p, i) {
      pcb.lists['waiting'].splice(p - i, 1);
      //TODO Fix splices.
    });

    if(this.lists['running'].hasSpace()) {
      this.lists['new'].forEach(function(p){
        if(pcb.lists['ready'].hasSpace())
          pcb.lists['ready'].push(p);
        else
          pcb.lists['terminated'].push(p);
      });
      this.lists['new'].processes = [];
    }

    toRemove = [];
    this.lists['ready'].forEach(function(p, i) {
      if(pcb.lists['running'].hasSpace()) {
        toRemove.push(i);
        p.quantum = 0;
        pcb.lists['running'].push(p);
      }
    });
    toRemove.forEach(function(p, i) {
      pcb.lists['ready'].splice(p - i, 1);
    });

    this.lists['new'].fillDisplay();
    this.lists['ready'].fillDisplay();
    this.lists['running'].fillDisplay();
    this.lists['waiting'].fillDisplay();
    this.lists['io'].fillDisplay();
    this.lists['terminated'].fillDisplay();

    $('#clock-label').html(this.cycle);
  }

  fillPCBTable() {

  }
}


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
  interval = setInterval(cycle, $('#delay-slider').slider('getValue') * 1000);
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

var pcb = new PCB();

function cycle() {
  pcb.tick();
}
