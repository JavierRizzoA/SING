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
    this.withError = false;
    this.waitedTime = 0;
    this.status = "New";
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
    this.waitedTime++;
    this.timeInSystem++;
    this.moved = false;
  }
}

class List {
  constructor(display) {
    this.display = display;
    this.limit = 50000000;
    this.processes = [];
    this.penguinMoveCount = 0;
  }

  fillDisplay() {
    this.display.empty();
    var that = this;
    this.processes.forEach(function(p) {
      if(!p.withError)
        that.display.append('<option>' + p.id + '</option>');
      else
        that.display.append('<option style="color: #FF0000">' + p.id + '</option>');
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

  hasPenguinSpace() {
    return (this.penguinMoveCount + this.processes.length) < this.limit;
  }
}

class Movement {
  constructor(sourceList, processID, destinationList) {
    this.sourceList = sourceList;
    this.processID = processID;
    this.destinationList = destinationList;
    pcb.lists[destinationList].penguinMoveCount++;
  }

  getIndex() {
    var index = -1;
    var that = this;
    pcb.lists[this.sourceList].forEach(function(p, i) {
      if(p.id === that.processID) {
        index = i;
        return;
      }
    });
    return index;
  }
}

class PCB {
  constructor() {
    this.processCount = 0;
    this.cycle = 0;

    this.allProcesses = [];

    this.lists = [];
    this.lists['new'] = new List($('#new-select'));
    this.lists['ready'] = new List($('#ready-select'));
    this.lists['waiting'] = new List($('#waiting-select'));
    this.lists['running'] = new List($('#running-select'));
    this.lists['io'] = new List($('#io-select'));
    this.lists['terminated'] = new List($('#terminated-select'));

    this.lists['running'].limit = 4;
    this.lists['io'].limit = 1;

    this.movingPenguin = false;
    this.penguinProcess = null;
    this.penguinMovements = [];
  }

  moveProcesses() {
    var toRemove = [];
    this.lists['running'].forEach(function(p, i) {
      if(p.cpuUsed >= p.cpuNeeded && !p.moved) {
        toRemove.push(i);
        p.finishedCycle = pcb.cycle;
        p.status = 'Terminated';
        pcb.lists['terminated'].push(p);
        p.moved = true;
      } else if(p.cpuUsed >= p.ioStart && p.ioNeeded != 0  && p.ioUsed === 0 && !p.moved) {
        p.moved = true;
        toRemove.push(i);
        if(pcb.lists['waiting'].hasSpace()) {
          p.status = 'Waiting';
          pcb.lists['waiting'].push(p);
        } else {
          p.withError = true;
          p.finishedCycle = pcb.cycle;
          p.status = 'Error';
          pcb.lists['terminated'].push(p);
        }
      } else if(p.quantum == $('#quantum-slider').slider('getValue') && !p.moved && $('#rr-radio').prop('checked')) {
        p.moved = true;
        toRemove.push(i);
        p.status = 'Ready';
        pcb.lists['ready'].push(p);
      }
    });
    toRemove.forEach(function(p, i) {
      pcb.lists['running'].splice(p - i, 1);
    });

    toRemove = [];
    this.lists['io'].forEach(function(p, i) {
      if(p.ioUsed >= p.ioNeeded && !p.moved) {
        toRemove.push(i);
        p.moved = true;
        if(pcb.lists['ready'].hasSpace()) {
          p.status = 'Ready';
          pcb.lists['ready'].push(p);
        } else {
          p.withError = true;
          p.finishedCycle = pcb.cycle;
          p.status = 'Error';
          pcb.lists['terminated'].push(p);
        }
      }
    });
    toRemove.forEach(function(p, i) {
      pcb.lists['io'].splice(p - i, 1);
    });

    toRemove = [];
    this.lists['waiting'].forEach(function(p, i) {
      if(pcb.lists['io'].hasSpace() && !p.moved) {
        p.moved = true;
        p.status = 'Using I/O';
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
          if(pcb.lists['ready'].hasSpace()) {
            p.status = 'Ready';
            pcb.lists['ready'].push(p);
          } else {
            p.withError = true;
            p.finishedCycle = pcb.cycle;
            p.status = 'Error';
            pcb.lists['terminated'].push(p);
          }
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
        p.status = 'Running';
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
    if(Math.random() * 100 <= $('#new-process-probability-slider').slider('getValue') && this.lists['new'].hasSpace()) {
      var p = new Process('P' + this.processCount++, this.cycle);
      this.allProcesses.push(p);
      p.moved = true;
      p.status = 'New';
      this.lists['new'].push(p);
    }
  }

  updateQuantumLabels() {
    $('#quantum-1-label').hide();
    $('#quantum-2-label').hide();
    $('#quantum-3-label').hide();
    $('#quantum-4-label').hide();
    switch(this.lists['running'].processes.length) {
      case 4:
        $('#quantum-4-label').show();
        $('#quantum-4-label').html((this.lists['running'].processes[3].quantum - 1 >= 0) ? this.lists['running'].processes[3].quantum - 1 : '0');
      case 3:
        $('#quantum-3-label').show();
        $('#quantum-3-label').html((this.lists['running'].processes[2].quantum - 1 >= 0) ? this.lists['running'].processes[2].quantum - 1 : '0');
      case 2:
        $('#quantum-2-label').show();
        $('#quantum-2-label').html((this.lists['running'].processes[1].quantum - 1 >= 0) ? this.lists['running'].processes[1].quantum - 1 : '0');
      case 1:
        $('#quantum-1-label').show();
        $('#quantum-1-label').html((this.lists['running'].processes[0].quantum - 1 >= 0) ? this.lists['running'].processes[0].quantum - 1 : '0');
        $('#quantum-4-label').parent().show();
        break;
      case 0:
        $('#quantum-4-label').parent().hide();
        break;
    }
    if($('#fcfs-radio').prop('checked'))
        $('#quantum-4-label').parent().hide();
  }

  updateListLimits() {
    if($('#list-limits-checkbox').prop('checked')) {
      this.lists['new'].limit = $('#new-limit-slider').slider('getValue');
      this.lists['ready'].limit = $('#ready-limit-slider').slider('getValue'); 
      this.lists['waiting'].limit = $('#waiting-limit-slider').slider('getValue'); 

      var toRemove = [];
      for(var i = this.lists['new'].limit - 1; i < this.lists['new'].length(); i++) {
        this.lists['new'].processes[i].withError = true;
        toRemove.push(i);
        this.lists['new'].processes[i].finishedCycle = this.cycle;
        this.lists['new'].processes[i].status = 'Error';
        this.lists['terminated'].push(this.lists['new'].processes[i]);
      }
      toRemove.forEach(function(p, i) {
        pcb.lists['new'].splice(p - i, 1);
      });

      var toRemove = [];
      for(var i = this.lists['ready'].limit - 1; i < this.lists['ready'].length(); i++) {
        this.lists['ready'].processes[i].withError = true;
        toRemove.push(i);
        this.lists['ready'].processes[i].finishedCycle = this.cycle;
        this.lists['ready'].processes[i].status = 'Error';
        this.lists['terminated'].push(this.lists['ready'].processes[i]);
      }
      toRemove.forEach(function(p, i) {
        pcb.lists['ready'].splice(p - i, 1);
      });

      var toRemove = [];
      for(var i = this.lists['waiting'].limit - 1; i < this.lists['waiting'].length(); i++) {
        this.lists['waiting'].processes[i].withError = true;
        toRemove.push(i);
        this.lists['waiting'].processes[i].finishedCycle = this.cycle;
        this.lists['waiting'].processes[i].status = 'Error';
        this.lists['terminated'].push(this.lists['waiting'].processes[i]);
      }
      toRemove.forEach(function(p, i) {
        pcb.lists['waiting'].splice(p - i, 1);
      });
    } else {
      this.lists['new'].limit = 50000000;
      this.lists['ready'].limit = 50000000;
      this.lists['waiting'].limit = 50000000;
    }
  }

  penguinUpdateListLimits() {
    if($('#list-limits-checkbox').prop('checked')) {
      this.lists['new'].limit = $('#new-limit-slider').slider('getValue');
      this.lists['ready'].limit = $('#ready-limit-slider').slider('getValue'); 
      this.lists['waiting'].limit = $('#waiting-limit-slider').slider('getValue'); 

      for(var i = this.lists['new'].limit - 1; i < this.lists['new'].length(); i++) {
        this.lists['new'].processes[i].withError = true;
        this.lists['new'].processes[i].finishedCycle = this.cycle;
        this.lists['new'].processes[i].status = 'Error';
        pcb.penguinMovements.push(new Movement('new', this.lists['new'].processes[i].id, 'terminated'));
      }

      for(var i = this.lists['ready'].limit - 1; i < this.lists['ready'].length(); i++) {
        this.lists['ready'].processes[i].withError = true;
        this.lists['ready'].processes[i].finishedCycle = this.cycle;
        this.lists['ready'].processes[i].status = 'Error';
        pcb.penguinMovements.push(new Movement('ready', this.lists['ready'].processes[i].id, 'terminated'));
      }

      for(var i = this.lists['waiting'].limit - 1; i < this.lists['waiting'].length(); i++) {
        this.lists['waiting'].processes[i].withError = true;
        this.lists['waiting'].processes[i].finishedCycle = this.cycle;
        this.lists['waiting'].processes[i].status = 'Error';
        pcb.penguinMovements.push(new Movement('waiting', this.lists['waiting'].processes[i].id, 'terminated'));
      }
    } else {
      this.lists['new'].limit = 50000000;
      this.lists['ready'].limit = 50000000;
      this.lists['waiting'].limit = 50000000;
    }
  }


  updateCPUCores() {
    this.lists['running'].limit = $('#cores-slider').slider('getValue');
    $('#core-number').html(this.lists['running'].limit + (this.lists['running'].limit === 1 ? ' core' : ' cores'));
    var toRemove = [];
    for(var i = this.lists['running'].limit; i < this.lists['running'].length(); i++) {
      toRemove.push(i);
      if(this.lists['ready'].hasSpace) {
        this.lists['running'].processes[i].status = 'Ready';
        this.lists['ready'].push(this.lists['running'].processes[i]);
      } else {
        this.lists['running'].processes[i].withError = true;
        this.lists['running'].processes[i].finishedCycle = this.cycle;
        this.lists['running'].processes[i].status = 'Error';
        this.lists['terminated'].push(this.lists['running'].processes[i]);
      }
    }
    toRemove.forEach(function(p, i) {
      pcb.lists['running'].splice(p - i, 1);
    });
  }

  penguinUpdateCPUCores() {
    this.lists['running'].limit = $('#cores-slider').slider('getValue');
    $('#core-number').html(this.lists['running'].limit + (this.lists['running'].limit === 1 ? ' core' : ' cores'));
    for(var i = this.lists['running'].limit; i < this.lists['running'].length(); i++) {
      if(this.lists['ready'].hasPenguinSpace()) {
        this.lists['running'].processes[i].status = 'Ready';
        pcb.penguinMovements.push(new Movement('running', this.lists['running'].processes[i].id, 'ready'));
        this.lists['ready'].push(this.lists['running'].processes[i]);
      } else {
        this.lists['running'].processes[i].withError = true;
        this.lists['running'].processes[i].finishedCycle = this.cycle;
        this.lists['running'].processes[i].status = 'Error';
        pcb.penguinMovements.push(new Movement('running', this.lists['running'].processes[i].id, 'terminated'));
      }
    }
  }

  penguinMoveProcess(sourceList, i, destinationList) {
    pcb.penguinMovements.splice(0, 1);
    $('#penguin-container').animate({top: $('#' + sourceList + '-select').offset().top, left: $('#' + sourceList + '-select').offset().left}, $('#delay-slider').slider('getValue') * 1000, function() {
      pcb.penguinProcess = pcb.lists[sourceList].processes[i];
      pcb.lists[sourceList].splice(i, 1);
      pcb.displayProcesses();
      pcb.updateQuantumLabels();
      $('#penguin-process').html(pcb.penguinProcess.id);
      $('#penguin-process').show();
      $('#penguin-container').animate({top: $('#' +  destinationList + '-select').offset().top, left: $('#' +  destinationList + '-select').offset().left}, $('#delay-slider').slider('getValue') * 1000, function() {
        pcb.lists[destinationList].push(pcb.penguinProcess);
        $('#penguin-process').hide();
        pcb.displayProcesses();
        pcb.updateQuantumLabels();
        pcb.movingPenguin = false;
      });
    });
  }

  penguinMoveProcesses() {
    this.lists['running'].forEach(function(p, i) {
      if(p.cpuUsed >= p.cpuNeeded && !p.moved) {
        p.finishedCycle = pcb.cycle;
        p.status = 'Terminated';
        pcb.penguinMovements.push(new Movement('running', p.id, 'terminated'));
        p.moved = true;
      } else if(p.cpuUsed >= p.ioStart && p.ioNeeded != 0 && p.ioUsed === 0 && !p.moved) {
        p.moved = true;
        if(pcb.lists['waiting'].hasPenguinSpace()) {
          p.status = 'Waiting';
          pcb.penguinMovements.push(new Movement('running', p.id, 'waiting'));
        } else {
          p.withError = true;
          p.finishedCycle = pcb.cycle;
          p.status = 'Error';
          pcb.penguinMovements.push(new Movement('running', p.id, 'terminated'));
        }
      } else if(p.quantum == $('#quantum-slider').slider('getValue') && !p.moved && $('#rr-radio').prop('checked')) {
        p.moved = true;
        pcb.penguinMovements.push(new Movement('running', p.id, 'ready'));
      }
    });

    this.lists['io'].forEach(function(p, i) {
      if(p.ioUsed >= p.ioNeeded && !p.moved) {
        p.moved = true;
        if(pcb.lists['ready'].hasPenguinSpace()) {
          p.status = 'Ready';
          pcb.penguinMovements.push(new Movement('io', p.id, 'ready'));
        } else {
          p.withError = true;
          p.finishedCycle = pcb.cycle;
          p.status = 'Error';
          pcb.penguinMovements.push(new Movement('io', p.id, 'terminated'));
        }
      }
    });

    this.lists['waiting'].forEach(function(p, i) {
      if(pcb.lists['io'].hasPenguinSpace() && !p.moved) {
        p.moved = true;
        p.status = 'Using I/O';
        pcb.penguinMovements.push(new Movement('waiting', p.id, 'io'));
      }
    });

    if(this.lists['running'].hasPenguinSpace()) {
      this.lists['new'].forEach(function(p, i){
        if(!p.moved) {
          if(pcb.lists['ready'].hasPenguinSpace()) {
            p.status = 'Ready';
            pcb.penguinMovements.push(new Movement('new', p.id, 'ready'));
          } else {
            p.withError = true;
            p.finishedCycle = pcb.cycle;
            p.status = 'Error';
            pcb.penguinMovements.push(new Movement('new', p.id, 'terminated'));
          }
          p.moved = true;
        }
      });
    }

    this.lists['ready'].forEach(function(p, i) {
      if(pcb.lists['running'].hasPenguinSpace() && !p.moved) {
        p.quantum = 0;
        p.moved = true;
        p.status = 'Running';
        pcb.penguinMovements.push(new Movement('ready', p.id, 'running'));
      }
    });
  }

  tick() {
    if(!$('#penguin-mode-checkbox').prop('checked')) {
      this.movingPenguin = true;
      this.cycle++;
      $('#clock-label').html(this.cycle);
      this.createProcesses();
      this.moveProcesses();
      this.updateListLimits();
      this.updateCPUCores();
      this.runProcesses();
      this.displayProcesses();
      this.updateQuantumLabels();
      this.fillPCBTable();
      this.movingPenguin = false;
    } else {
      if(this.penguinMovements.length === 0 && !this.movingPenguin) {
        this.lists['new'].penguinMoveCount = 0;
        this.lists['ready'].penguinMoveCount = 0;
        this.lists['waiting'].penguinMoveCount = 0;
        this.lists['running'].penguinMoveCount = 0;
        this.lists['io'].penguinMoveCount = 0;
        this.lists['terminated'].penguinMoveCount = 0;

        this.penguinUpdateListLimits();
        this.penguinUpdateCPUCores();
        this.runProcesses();
        this.updateQuantumLabels();
        this.fillPCBTable();
        this.cycle++;
        $('#clock-label').html(this.cycle);
        this.createProcesses();
        this.displayProcesses();
        this.penguinMoveProcesses();
      } else {
        if(!this.movingPenguin) {
          this.movingPenguin = true;
          this.penguinMoveProcess(this.penguinMovements[0].sourceList, this.penguinMovements[0].getIndex(), this.penguinMovements[0].destinationList);
        }
      }
    }
  }

  fillPCBTable() {
    $('#pcb-table').html("");
    this.allProcesses.forEach(function(p) {
      $('#pcb-table').html(
        $('#pcb-table').html() +
        ((p.withError) ? '<tr style="color: #FF0000">' : '<tr>') +
        '<td>' + p.id +'</td>' +
        '<td>' + p.status +'</td>' +
        '<td>' + p.creationCycle +'</td>' +
        '<td>' + p.cpuNeeded +'</td>' +
        '<td>' + p.cpuUsed +'</td>' +
        '<td>' + ((p.ioNeeded === 0) ? '---' : p.ioStart) +'</td>' +
        '<td>' + p.ioNeeded +'</td>' +
        '<td>' + p.ioUsed +'</td>' +
        '<td>' + p.finishedCycle +'</td>' +
        '<td>' + p.waitedTime +'</td>' +
        '<td>' + p.timeInSystem +'</td>' +
        '</tr>'
      );
    });
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

$('#rr-radio').prop('checked', true);

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

$('#penguin-mode-checkbox').change(function() {
  if(this.checked) {
    if(running) {
      clearInterval(interval);
      interval = setInterval(cycle, 100);
    }
  } else {
    if(running) {
      clearInterval(interval);
      interval = setInterval(cycle, $('#delay-slider').slider('getValue') * 1000);
    }
    $('#delay-slider').slider('enable');
  }
});

$('#delay-slider').on('change', function(e) {
  if(running && !$('#penguin-mode-checkbox').prop('checked')) {
    clearInterval(interval);
    interval = setInterval(cycle, $('#delay-slider').slider('getValue') * 1000);
  }
});

$('#cores-slider').on('change', function(e) {
  $('#core-number').html($('#cores-slider').slider('getValue') + ($('#cores-slider').slider('getValue') === 1 ? ' core' : ' cores'));
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
  $('#penguin-container').stop(true, false);
  returnPenguin();
  $('#play-badge').parent().show();
  $('#pause-badge').parent().hide();
  running = false;
  clearInterval(interval);
  pcb = new PCB();
  pcb.displayProcesses();
  pcb.updateQuantumLabels();
  pcb.fillPCBTable();
  $('#clock-label').html(0);
});

function toggleQuantum() {
  if($('#rr-radio').prop('checked'))
    $('#quantum-slider').slider('enable');
  else
    $('#quantum-slider').slider('disable');
}

$('#rr-radio').change(toggleQuantum);
$('#fcfs-radio').change(toggleQuantum);

function returnPenguin() {
  $('#penguin-process').hide();
  $('#penguin-container').css('top', $('#logo').offset().top - 70);
  $('#penguin-container').css('left', $('#logo').offset().left - 90);
}

$('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
  var target = $(e.target).attr("href"); // activated tab
  if(target !== '#simulation') {
    $('#penguin-container').hide();
  } else {
    $('#penguin-container').show();
    if(!$('#penguin-mode-checkbox').prop('checked')) {
      $('#penguin-container').stop(true, false);
      returnPenguin();
    } else {
      $('#penguin-container').stop(false, true);
      $('#penguin-container').css('top', $('#' + 'running' + '-select').offset().top);
      $('#penguin-container').css('left', $('#' + 'running' + '-select').offset().top);
    }
  }
});

$(window).resize(function() {
  returnPenguin();
});

$(document).ready(function() {
  returnPenguin();
});

var pcb = new PCB();

function cycle() {
  pcb.tick();
}

//$('#penguin-container').animate({top: $('#logo').offset().top - 50, left: $('#logo').offset().left - 36});
