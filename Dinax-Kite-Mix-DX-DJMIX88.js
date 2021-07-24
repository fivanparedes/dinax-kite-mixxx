/* ===============================================
    DINAX KITE MIX 88 CONTROLLER PRESET FOR MIXXX
            by Fernando Ivan Paredes
   ===============================================

    Mappings:
    0x4C - play B
    0x4B - Load A
    0x4A - play A
    0x49 - scratch B
    0x48 - scratch A
    0x47 - sync B
    x46 - effect B
    0x45 - select effect B
    0x44 - effect A
    0x43 - select effect A
    0x42 - cue B
    0x40 - sync A
    0x3B - cue A

    0x34 - Load B
    0x33 - Head preview
    0x1A - Selection wheel
    0x19 - Jogwheel A
    0x18 - Jogwheel B
    0x17 - Master volume
    0x15 - Bass B
    0x14 - Treble A
    0x11 - Treble B
    0x10 - Bass A
    0x0E - EFX B
    0x0D - EFX A
    0x0C - Pitch B
    0x0B - Pitch A
    0x0A - Crossfader
    0x09 - Level B
    0x08 - Level A */

function DinaxKiteMix () {}
DinaxKiteMix.leds = {
"scratch":0x48,
"[Channel1] sync":0x40,
"[Channel1] rev":0x33,
"[Channel1] cue":0x3B,
"[Channel1] play":0x4A,
"[Channel2] sync":0x47,
"[Channel2] rev":0x3C,
"[Channel2] cue":0x42,
"[Channel2] play":0x4C
};

DinaxKiteMix.debug = true;
DinaxKiteMix.ledOn = 0x7F;
DinaxKiteMix.ledOff = 0x00;
DinaxKiteMix.scratchMode = false;
DinaxKiteMix.pitchDial1 = false;
DinaxKiteMix.pitchDial2 = false;

DinaxKiteMix.init = function (id) {    // called when the MIDI device is opened & set up
    print ("Ion Discover DJ id: \""+id+"\" initialized.");

    var timeToWait = 20;
    for (var LED in DinaxKiteMix.leds ) {
        DinaxKiteMix.sendMidi(0x80, DinaxKiteMix.leds[LED], DinaxKiteMix.ledOff, timeToWait);
        timeToWait += 5;
    }
    
    for (var LED in DinaxKiteMix.leds ) {
        DinaxKiteMix.sendMidi(0x90, DinaxKiteMix.leds[LED], DinaxKiteMix.ledOn, timeToWait);
        timeToWait += 5;
    }
    
    timeToWait += 1000;
    for (var LED in DinaxKiteMix.leds ) {
        DinaxKiteMix.sendMidi(0x80, DinaxKiteMix.leds[LED], DinaxKiteMix.ledOff, timeToWait);
        timeToWait += 5;
    }
    
    engine.connectControl("[Channel1]", "play_indicator", "DinaxKiteMix.PlayLED");
    engine.connectControl("[Channel2]", "play_indicator", "DinaxKiteMix.PlayLED");
    engine.connectControl("[Channel1]", "cue_indicator", "DinaxKiteMix.CueLED");
    engine.connectControl("[Channel2]", "cue_indicator", "DinaxKiteMix.CueLED");
    engine.connectControl("[Channel1]", "beat_active", "DinaxKiteMix.SyncLED");
    engine.connectControl("[Channel2]", "beat_active", "DinaxKiteMix.SyncLED");
    engine.connectControl("[Channel1]", "reverse", "DinaxKiteMix.RevLED");
    engine.connectControl("[Channel2]", "reverse", "DinaxKiteMix.RevLED");
};

DinaxKiteMix.sendMidi = function(status, control, value, timeToWait) {
   if(timeToWait == 0) {
      midi.sendShortMsg(status, control, value);
   } else {
      engine.beginTimer(timeToWait, "midi.sendShortMsg(" + status + ", " + control + ", " + value + ")", true);
   }
};

//Decks
DinaxKiteMix.Deck = function (deckNumber, group) {
   this.deckNumber = deckNumber;
   this.group = group;
   this.shiftMode = false;
   this.scratching = false;
   this.Buttons = [];
};

DinaxKiteMix.Deck.prototype.jogMove = function(jogValue) {
   if(this.shiftMode) {
      var newRate = engine.getValue(this.group, "rate") + (jogValue/3000);
      engine.setValue(this.group, "rate", newRate);
   } else if(this.scratching) {
      engine.scratchTick(this.deckNumber, jogValue/3);
   } else {
      jogValue = jogValue / 25;
      engine.setValue(this.group,"jog", jogValue);
   }
};

DinaxKiteMix.Decks = {"Left":new DinaxKiteMix.Deck(1,"[Channel1]"), "Right":new DinaxKiteMix.Deck(2,"[Channel2]")};
DinaxKiteMix.GroupToDeck = {"[Channel1]":"Left", "[Channel2]":"Right"};

DinaxKiteMix.GetDeck = function(group) {
   try {
      return DinaxKiteMix.Decks[DinaxKiteMix.GroupToDeck[group]];
   } catch(ex) {
      return null;
   }
};


DinaxKiteMix.getControl = function (io, channel, name) { 
    // Accept channel in form 'N' or '[ChannelN]'
    channel = channel.replace(/\[Channel(\d)\]/, "$1");

    for (control in DinaxKiteMix.controls.inputs) {
    if (DinaxKiteMix.controls.inputs[control].channel == channel && 
        DinaxKiteMix.controls.inputs[control].name == name
        ) return DinaxKiteMix.controls.inputs[control];
    }

    print ("DinaxKiteMix.getControl: Control not found: io=" + io + ": channel=" + channel + ": name=" + name);
}

DinaxKiteMix.shutdown = function() {
}

DinaxKiteMix.toggle_scratch_mode_on = function (control, value, status) {
    if(DinaxKiteMix.scratchMode) {
       DinaxKiteMix.scratchMode = false;
       midi.sendShortMsg(0x80, DinaxKiteMix.leds["scratch"] , DinaxKiteMix.ledOff);
    } else {
       DinaxKiteMix.scratchMode = true;
       midi.sendShortMsg(0x90, DinaxKiteMix.leds["scratch"] , DinaxKiteMix.ledOn);
    }
}


DinaxKiteMix.jog_touch = function (channel, control, value, status, group) {
   var deck = DinaxKiteMix.GetDeck(group);
   if(value) {
      if(DinaxKiteMix.scratchMode) {
         engine.scratchEnable(deck.deckNumber, 512, 33+(1/3), 0.2, 0.2/32);
         deck.scratching = true;
      }
   } else {
      deck.scratching = false;
      engine.scratchDisable(deck.deckNumber);
   }
};

DinaxKiteMix.jog_wheel = function (channel, control, value, status, group) {
   // 7F > 40: CCW Slow > Fast - 127 > 64 
   // 01 > 3F: CW Slow > Fast - 0 > 63
   var jogValue = value >=0x40 ? value : value - 0x80; // -64 to +63, - = CCW, + = CW
   DinaxKiteMix.GetDeck(group).jogMove(jogValue);
};

DinaxKiteMix.reversek = function (channel, control, value, status, group) {
   var deck = DinaxKiteMix.GetDeck(group);
   
   deck.shiftMode = (value == 0x7F); //If button down on, else off
}

DinaxKiteMix.volCh1Up = function (group, control, value, status) {
engine.setValue("[Channel1]","pregain", engine.getValue("[Channel1]", "pregain") + 0.1);
}
DinaxKiteMix.volCh1Down = function (group, control, value, status) {
engine.setValue("[Channel1]","pregain", engine.getValue("[Channel1]", "pregain") - 0.1);
}
DinaxKiteMix.volCh2Up = function (group, control, value, status) {
engine.setValue("[Channel2]","pregain", engine.getValue("[Channel2]", "pregain") + 0.1);
}
DinaxKiteMix.volCh2Down = function (group, control, value, status) {
engine.setValue("[Channel2]","pregain", engine.getValue("[Channel2]", "pregain") - 0.1);
}

DinaxKiteMix.pflCh1On = function (group, control, value, status) {
   if(engine.getValue("[Channel1]", "pfl")){
      engine.setValue("[Channel1]","pfl", false);
      midi.sendShortMsg(0x90, DinaxKiteMix.leds["[Channel1] cue"], DinaxKiteMix.ledOff);}
   else {
      engine.setValue("[Channel1]","pfl", true);
      midi.sendShortMsg(0x90, DinaxKiteMix.leds["[Channel1] cue"], DinaxKiteMix.ledOn);}
   }
DinaxKiteMix.pflCh1Off = function (group, control, value, status) {}

DinaxKiteMix.pflCh2On = function (group, control, value, status) {
   if(engine.getValue("[Channel2]", "pfl")){
      engine.setValue("[Channel2]","pfl", false);
      midi.sendShortMsg(0x90, DinaxKiteMix.leds["[Channel2] cue"], DinaxKiteMix.ledOff);
   }
   else {
      engine.setValue("[Channel2]","pfl", true);
      midi.sendShortMsg(0x90, DinaxKiteMix.leds["[Channel2] cue"], DinaxKiteMix.ledOn);
   }}



DinaxKiteMix.LoadSelectedTrackCh1 = function (group, control, value, status) {
   midi.sendShortMsg(0x90, DinaxKiteMix.leds["[Channel1] play"], DinaxKiteMix.ledOn);
   engine.setValue("[Channel1]","LoadSelectedTrack", true);
}

DinaxKiteMix.LoadSelectedTrackCh2 = function (group, control, value, status) {
   midi.sendShortMsg(0x90, DinaxKiteMix.leds["[Channel2] play"], DinaxKiteMix.ledOn);
   engine.setValue("[Channel2]","LoadSelectedTrack", true);
}

DinaxKiteMix.PlayLED = function (value, group, control) {
    var deck = DinaxKiteMix.GetDeck(group);
    if(value) {
        midi.sendShortMsg(0x90, DinaxKiteMix.leds["[Channel" + deck.deckNumber +"] play"], DinaxKiteMix.ledOn);
    } else {
        midi.sendShortMsg(0x90, DinaxKiteMix.leds["[Channel" + deck.deckNumber +"] play"], DinaxKiteMix.ledOff);
    }
}

DinaxKiteMix.CueLED = function (value, group, control) {
    var deck = DinaxKiteMix.GetDeck(group);
    if(value) {
        midi.sendShortMsg(0x90, DinaxKiteMix.leds["[Channel" + deck.deckNumber +"] cue"], DinaxKiteMix.ledOn);
    } else {
        midi.sendShortMsg(0x90, DinaxKiteMix.leds["[Channel" + deck.deckNumber +"] cue"], DinaxKiteMix.ledOff);
    }
}

DinaxKiteMix.SyncLED = function (value, group, control) {
    var deck = DinaxKiteMix.GetDeck(group);
    if(value) {
        midi.sendShortMsg(0x90, DinaxKiteMix.leds["[Channel" + deck.deckNumber +"] sync"], DinaxKiteMix.ledOn);
    } else {
        midi.sendShortMsg(0x90, DinaxKiteMix.leds["[Channel" + deck.deckNumber +"] sync"], DinaxKiteMix.ledOff);
    }
}

DinaxKiteMix.RevLED = function (value, group, control) {
    var deck = DinaxKiteMix.GetDeck(group);
    if(value) {
        midi.sendShortMsg(0x90, DinaxKiteMix.leds["[Channel" + deck.deckNumber +"] rev"], DinaxKiteMix.ledOn);
    } else {
        midi.sendShortMsg(0x90, DinaxKiteMix.leds["[Channel" + deck.deckNumber +"] rev"], DinaxKiteMix.ledOff);
    }
}
