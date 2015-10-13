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
    this.moved = false;
  }

  run() {
    this.cpuUsed++;
    this.quantum++;
    this.timeInSystem++;
    this.moved = false;
  }

  useIO() {
    this.ioUsed++;
    this.timeInSystem++;
    this.moved = false;
  }

  wait() {
    this.timeInSystem++;
    this.moved = false;
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

  moveProcesses() {
    var toRemove = [];
    this.lists['running'].forEach(function(p, i) {
      if(p.cpuUsed === p.cpuNeeded && !p.moved) {
        toRemove.push(i);
        pcb.lists['terminated'].push(p);
        p.moved = true;
      } else if(p.cpuUsed == p.ioStart && !p.moved) {
        p.moved = true;
        toRemove.push(i);
        if(pcb.lists['waiting'].hasSpace())
          pcb.lists['waiting'].push(p);
        else
          pcb.lists['terminated'].push(p);
      } else if(p.quantum == $('#quantum-slider').slider('getValue') && pcb.lists['ready'].processes.length <= pcb.lists['ready'].limit && !p.moved) {
        p.moved = true;
        toRemove.push(i);
        pcb.lists['ready'].push(p);
      }
    });
    toRemove.forEach(function(p, i) {
      pcb.lists['running'].splice(p - i, 1);
    });

    toRemove = [];
    this.lists['io'].forEach(function(p, i) {
      if(p.ioUsed === p.ioNeeded && !p.moved) {
        toRemove.push(i);
        p.moved = true;
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
    this.lists['waiting'].forEach(function(p, i) {
      if(pcb.lists['io'].hasSpace() && !p.moved) {
        p.moved = true;
        pcb.lists['io'].push(p);
        toRemove.push(i);
      }
    });
    toRemove.forEach(function(p, i) {
      pcb.lists['waiting'].splice(p - i, 1);
    });

    toRemove = [];
    if(this.lists['running'].hasSpace()) {
      this.lists['new'].forEach(function(p, i){
        if(!p.moved) {
          if(pcb.lists['ready'].hasSpace())
            pcb.lists['ready'].push(p);
          else
            pcb.lists['terminated'].push(p);
          toRemove.push(i);
          p.moved = true;
        }
      });
    }
    toRemove.forEach(function(p, i) {
      pcb.lists['new'].splice(p - i, 1);
    });

    toRemove = [];
    this.lists['ready'].forEach(function(p, i) {
      if(pcb.lists['running'].hasSpace() && !p.moved) {
        toRemove.push(i);
        p.quantum = 0;
        p.moved = true;
        pcb.lists['running'].push(p);
      }
    });
    toRemove.forEach(function(p, i) {
      pcb.lists['ready'].splice(p - i, 1);
    });
  }

  runProcesses() {
    this.lists['new'].forEach(function(p) {p.wait();});
    this.lists['ready'].forEach(function(p) {p.wait();});
    this.lists['running'].forEach(function(p) {p.run();});
    this.lists['waiting'].forEach(function(p) {p.wait();});
    this.lists['io'].forEach(function(p) {p.useIO();});
  }

  displayProcesses() {
    this.lists['new'].fillDisplay();
    this.lists['ready'].fillDisplay();
    this.lists['running'].fillDisplay();
    this.lists['waiting'].fillDisplay();
    this.lists['io'].fillDisplay();
    this.lists['terminated'].fillDisplay();
  }

  createProcesses() {
    if(Math.random() * 100 <= $('#new-process-probability-slider').slider('getValue')) {
      //TODO Do not create when full.
      var p = new Process('P' + this.processCount++, this.cycle);
      p.moved = true;
      this.lists['new'].push(p);
    }
  }

  tick() {
    this.cycle++;
    $('#clock-label').html(this.cycle);
    this.createProcesses();
    this.moveProcesses();
    this.runProcesses();
    this.displayProcesses();
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
