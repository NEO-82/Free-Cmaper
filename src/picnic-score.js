/** Original 16-bar picnic score, in C major, scheduled at eighth-note resolution. */
export const PICNIC_BPM=104;
const chords=[[48,60,64,67,71],[45,60,64,67,69],[53,60,65,69,72],[55,62,65,67,71],[48,60,64,67,72],[52,59,64,67,71],[53,60,65,69,74],[55,59,62,67,69],
 [57,60,64,67,72],[50,60,62,65,69],[53,60,64,65,69],[55,59,62,65,71],[48,60,64,67,74],[45,60,64,69,72],[53,60,65,69,72],[55,59,62,67,74]];
const melody=[
 [72,null,76,79,81,79,76,74],[72,69,null,72,76,null,79,76],[77,76,74,null,72,69,72,74],[79,null,77,74,71,74,76,null],
 [76,79,84,null,83,81,79,76],[71,null,74,76,79,76,74,null],[77,81,84,81,79,null,77,76],[74,71,72,74,79,null,null,null],
 [81,null,79,76,72,76,79,81],[77,74,null,77,81,79,77,74],[77,76,72,69,72,null,76,77],[79,77,74,null,71,74,79,83],
 [84,null,79,76,74,76,79,null],[81,79,76,72,69,null,72,76],[77,81,79,77,76,72,74,76],[74,71,67,null,72,null,null,null]];
export function picnicNotes(tick){
 const bar=Math.floor(tick/8)%16,step=tick%8,chord=chords[bar],events=[];
 if(step===0||step===4)events.push({note:chord[0]+(step===4?7:0),offset:0,duration:.43,gain:.11,voice:'bass'});
 if(step===0||step===3||step===6)chord.slice(1).forEach((note,i)=>events.push({note,offset:i*.016,duration:.5,gain:.037,voice:'guitar'}));
 events.push({note:chord[1+step%4]+12,offset:.01,duration:.23,gain:step%2?.022:.035,voice:'bell'});
 const note=melody[bar][step];if(note!==null)events.push({note,offset:.025,duration:melody[bar][(step+1)%8]===null?.47:.24,gain:.085,voice:'flute'});
 if(step%2)events.push({note:96+(bar+step)%3,offset:0,duration:.028,gain:.012,voice:'shaker'});
 return events;
}
