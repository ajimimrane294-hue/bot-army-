import { Client, GatewayIntentBits, REST, Routes, PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import Tesseract from 'tesseract.js';

const TOKEN = process.env.TOKEN;
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// الرومات المحددة
const ADMIN_ROOM = '1529159647146279022';
const USERS_ROOM = '1554843909526523914';
const ATTENDANCE_ROOM = '1560277268595474542'; 
const PROOF_LOG_ROOM = '1561405060909637732'; 

const WARN_ROLE_ID = 'RANG_ID_HERE'; 

let warns = {}; let tahdirs = {}; let lastResources = {};
try {
  const pw = ['./warns.json','../warns.json','./src/warns.json','src/warns.json'].find(f=>fs.existsSync(f));
  if(pw){ const d=JSON.parse(fs.readFileSync(pw,'utf8')); warns=d.warns||{}; tahdirs=d.tahdirs||{}; lastResources=d.lastResources||{}; }
} catch {}

function saveAll(){
  const data={warns,tahdirs,lastResources};
  fs.writeFileSync('./warns.json', JSON.stringify(data,null,2));
  try{fs.writeFileSync('./src/warns.json', JSON.stringify(data,null,2));}catch{}
}

function formatMod(mod){
  if(!mod) return 'مجهول';
  if(mod.includes('<@')) return mod;
  const clean = mod.replace(/[<@!>]/g,'');
  if(/^\d+$/.test(clean)) return `<@${clean}>`;
  return mod;
}

const commands = [
  new SlashCommandBuilder().setName('warn').setDescription('توبيخ عسكري رسمي').addStringOption(o=>o.setName('name').setDescription('اسم العسكري او منشن').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('السبب').setRequired(true)).addIntegerOption(o=>o.setName('count').setDescription('عدد التوبيخات').setRequired(false)).addAttachmentOption(o=>o.setName('daleel').setDescription('صورة الدليل').setRequired(false)).setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
  new SlashCommandBuilder().setName('warns').setDescription('عرض توبيخات عسكري').addStringOption(o=>o.setName('name').setDescription('اسم العسكري او منشن').setRequired(false)),
  new SlashCommandBuilder().setName('mywarns').setDescription('سجل التوبيخات الخاص بك').addStringOption(o=>o.setName('name').setDescription('اسم شخص اخر').setRequired(false)),
  new SlashCommandBuilder().setName('tahdir').setDescription('تحذير عسكري رسمي').addStringOption(o=>o.setName('name').setDescription('اسم العسكري او منشن').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('السبب').setRequired(true)).addAttachmentOption(o=>o.setName('daleel').setDescription('صورة الدليل').setRequired(false)).setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
  new SlashCommandBuilder().setName('tahdirs').setDescription('عرض تحذيرات عسكري').addStringOption(o=>o.setName('name').setDescription('اسم العسكري او منشن').setRequired(false)),
  new SlashCommandBuilder().setName('mytahdirs').setDescription('سجل التحذيرات الخاص بك').addStringOption(o=>o.setName('name').setDescription('اسم شخص اخر').setRequired(false)),
  new SlashCommandBuilder().setName('tard').setDescription('طرد عسكري نهائي من الصفوف').addStringOption(o=>o.setName('name').setDescription('اسم العسكري او منشن').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('السبب').setRequired(true)).addAttachmentOption(o=>o.setName('daleel').setDescription('صورة الدليل').setRequired(false)).setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
  new SlashCommandBuilder().setName('unwarn').setDescription('حذف توبيخ عسكري').addStringOption(o=>o.setName('name').setDescription('اسم العسكري او منشن').setRequired(true)).addIntegerOption(o=>o.setName('number').setDescription('رقم التوبيخ').setRequired(false)).setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
  new SlashCommandBuilder().setName('clearwarns').setDescription('حذف جميع التوبيخات لشخص أو للجميع').addStringOption(o=>o.setName('name').setDescription('اسم العسكري أو منشن (اتركه فارغاً لحذف الكل)').setRequired(false)).setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
  new SlashCommandBuilder().setName('untahdir').setDescription('حذف تحذير عسكري').addStringOption(o=>o.setName('name').setDescription('اسم العسكري او منشن').setRequired(true)).addIntegerOption(o=>o.setName('number').setDescription('رقم التحذير').setRequired(false)).setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
  new SlashCommandBuilder().setName('cleartahdirs').setDescription('حذف جميع التحذيرات لشخص أو للجميع').addStringOption(o=>o.setName('name').setDescription('اسم العسكري أو منشن (اتركه فارغاً لحذف الكل)').setRequired(false)).setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
].map(c=>c.toJSON());

client.on('clientReady', async ()=>{
  console.log("✅ Bot Army | Rio Rise V35.1 - النظام العسكري المطور جاهز ومستقر");
  const rest=new REST({version:'10'}).setToken(TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id),{body:commands});
  for(const [gid] of client.guilds.cache){try{await rest.put(Routes.applicationGuildCommands(client.user.id,gid),{body:commands});}catch{}}
});

function parseName(input){
  if(!input) return null;
  const m=input.match(/<@!?(\d+)>/);
  if(m) return {id:m[1],isMention:true};
  return {id:null,isMention:false,key:input.toLowerCase(),display:input};
}

async function resolveKey(guild,parsed){
  if(!parsed) return null;
  if(parsed.isMention){
    try{ const member=await guild.members.fetch(parsed.id); return {key:parsed.id,display:member.displayName||member.user.username,keyAlt:(member.displayName||member.user.username).toLowerCase()}; }
    catch{ return {key:parsed.id,display:`<@${parsed.id}>`,keyAlt:null}; }
  } else { return {key:parsed.key,display:parsed.display,keyAlt:null}; }
}

function hasAdminPermissions(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionsBitField.Flags.Administrator) || member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return true;
  return member.roles.cache.some(r => r.name.toLowerCase() === 'administration');
}

async function sendKickAnnouncement(targetDisplay, reason, modTag, daleelUrl, isMention, parsedId) {
  let roleMention = WARN_ROLE_ID === 'RANG_ID_HERE' ? '@warn' : `<@&${WARN_ROLE_ID}>`;
  let kickMsg = 
    `🚨 **⟨ بلاغ طرد نهائي من صفوف الفصيل ⟩** 🚨\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🪖 **العسكري المعني :** ${isMention ? `<@${parsedId}>` : targetDisplay}\n\n` +
    `📜 **صدر القرار بأمر من :** ${modTag}\n\n` +
    `❌ **السبب الرئيسي :** \`${reason}\`\n\n` +
    `⏳ **وقت الإصدار :** <t:${Math.floor(Date.now()/1000)}:f>\n\n` +
    `🎥 **الدليل المرفق :** ${daleelUrl ? 'مرفق أسفله 📸' : 'لا يوجد دليل مرئي'}\n\n` +
    `⚡ **القرار الصارم :** تم طرد المعني بالأمر نهائياً لعدم الانضباط.\n\n` +
    `🛑 **تنبيه للرتب المعنية (${roleMention}) :** يجب سحب وإزالة كافة رتب العسكري المعني حالاً.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  if(daleelUrl) kickMsg += `\n${daleelUrl}`;
  return kickMsg;
}

client.on('messageCreate', async message=>{
  if(message.author.bot) return;
  if(!message.guild) return;
  const content = message.content.trim();
  const lower = content.toLowerCase();

  if (message.channel.id === ATTENDANCE_ROOM && message.attachments.size > 0) {
    const attachment = message.attachments.first();
    const guildId = message.guild.id;
    const nowTimestamp = Math.floor(Date.now() / 1000);

    let extractedNumbers = "غير محدد";
    try {
      const { data: { text } } = await Tesseract.recognize(attachment.url, 'eng');
      const numbersMatch = text.match(/[\d\s\/]+/g);
      if (numbersMatch) {
        const cleanNum = numbersMatch.join(' ').replace(/\s+/g, ' ').trim();
        if (cleanNum.length > 2) extractedNumbers = cleanNum;
      }
    } catch {}

    try {
      const proofChannel = await message.guild.channels.fetch(PROOF_LOG_ROOM).catch(()=>{});
      if (proofChannel) {
        let proofMsg = 
          `📸 **⟨ تقرير الأرشيف والدليل العسكري ⟩** 🛡️\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `👤 **العسكري المُرسِل :** <@${message.author.id}>\n\n` +
          `⏳ **التاريخ والوقيت :** <t:${nowTimestamp}:f>\n\n` +
          `🔗 **صورة الدليل الموثقة :**\n${attachment.url}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        await proofChannel.send(proofMsg);
        await message.react('✅').catch(()=>{});
      }
    } catch {}

    let resourceStatus = `🟡 **حالة المخزن الميداني :** مستوى مستقر واحتياطي اعتيادي.`;
    if (!lastResources[guildId]) {
      lastResources[guildId] = { time: Date.now() };
      saveAll();
    } else {
      resourceStatus = `🟢 **حالة المخزن الميداني :** توازن تام واستقرار ممتاز مقارنة باليوم السابق.`;
    }

    let resourceReport = 
      `📊 **⟨ تقرير مراقبة المخزن والنشاط - Rio Rise ⟩** 🦅\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 **بواسطة العسكري :** <@${message.author.id}>\n\n` +
      `⏳ **التوقيت الرسمي :** <t:${nowTimestamp}:f>\n\n` +
      `📦 **الموارد المسجلة :** \` ${extractedNumbers} \`\n\n` +
      `${resourceStatus}\n\n` +
      `✍️ **تقدير القيادة :** شكراً على حس المسؤولية العالية ورفع التقارير في وقتها.\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    return message.channel.send(resourceReport);
  }

  if (lower === 'توبيخاتي' || lower === 'تحذيراتي' || lower.startsWith('توبيخات ') || lower.startsWith('تحذيرات ')) {
    if (message.channel.id !== USERS_ROOM) {
      return message.reply(`❌ عذراً، هذه الأوامر مسموحة حصرياً داخل روم الاستعلامات <#${USERS_ROOM}>`).then(m => setTimeout(() => m.delete().catch(()=>{}), 5000));
    }
  }

  if (lower.startsWith('توبيخ ') && !lower.startsWith('توبيخات') || 
      lower.startsWith('تحذير ') && !lower.startsWith('تحذيرات') || 
      lower.startsWith('طرد ') || 
      lower.startsWith('حذف') || lower.startsWith('مسح')) {
    
    if (message.channel.id !== ADMIN_ROOM) {
      return message.reply(`❌ الأوامر التأديبية مسموحة فقط داخل غرفة القيادة والإدارة العسكرية <#${ADMIN_ROOM}>`).then(m => setTimeout(() => m.delete().catch(()=>{}), 5000));
    }
    if (!hasAdminPermissions(message.member)) {
      return message.reply('❌ عذراً، رتبتك لا تتوفر على صلاحيات `Administration` لتنفيذ هذا الأمر.');
    }
  }

  if(lower === 'توبيخاتي'){
    const list = warns[message.guild.id]?.[message.author.id] || warns[message.guild.id]?.[(message.member?.displayName||message.author.username).toLowerCase()] || [];
    if(!list.length) return message.reply(
      `🛡️ **⟨ السجل التوبيخي الفردي ⟩** 🛡️\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 **العسكري المعني :** <@${message.author.id}>\n\n` +
      `✨ **حالة السجل :** نظيف تماماً ومثالي! ليس لديك أي توبيخ مسجل.\n\n` +
      `📊 **المعدل الحالي :** \` [ 0 / 3 ] \`\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    );
    let details=''; list.forEach((w,i)=>{ details+=`🔹 **التوبيخ رقم (${i+1}):**\n✍️ **بواسطة :** ${formatMod(w.mod)}\n📝 **السبب :** \`${w.reason}\`\n⏳ **التوقيت :** <t:${Math.floor(w.time/1000)}:f>\n🎥 **الدليل :** \`${w.daleel?'يوجد دليل بالأسفل 📸':'لا يوجد دليل'}\`\n\n`; });
    let finalMsg=
      `📋 **⟨ السجل التوبيخي الشامل ⟩** 📋\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 **العسكري :** <@${message.author.id}>\n\n` +
      `⚠️ **المعدل التراكمي :** \` [ ${list.length} / 3 ] \`\n\n` +
      `📜 **تفاصيل المخالفات:**\n\n${details}` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    const imgs=list.filter(w=>w.daleel).map(w=>w.daleel).join('\n'); if(imgs) finalMsg+=`\n\n${imgs}`;
    return message.reply(finalMsg);
  }

  if(lower === 'تحذيراتي'){
    const list = tahdirs[message.guild.id]?.[message.author.id] || tahdirs[message.guild.id]?.[(message.member?.displayName||message.author.username).toLowerCase()] || [];
    if(!list.length) return message.reply(
      `🛡️ **⟨ سجل التحذيرات الفردي ⟩** 🛡️\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 **العسكري المعني :** <@${message.author.id}>\n\n` +
      `✨ **حالة السجل :** ممتاز! ليس لديك أي تحذير مسجل في سجلك.\n\n` +
      `📊 **المعدل الحالي :** \` [ 0 / 3 ] \`\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    );
    let details=''; list.forEach((w,i)=>{ details+=`🔹 **التحذير رقم (${i+1}):**\n✍️ **بواسطة :** ${formatMod(w.mod)}\n📝 **السبب :** \`${w.reason}\`\n⏳ **التوقيت :** <t:${Math.floor(w.time/1000)}:f>\n🎥 **الدليل :** \`${w.daleel?'يوجد دليل بالأسفل 📸':'لا يوجد دليل'}\`\n\n`; });
    let finalMsg=
      `📋 **⟨ سجل التحذيرات الشامل ⟩** 📋\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 **العسكري :** <@${message.author.id}>\n\n` +
      `⚠️ **المعدل التراكمي :** \` [ ${list.length} / 3 ] \`\n\n` +
      `📜 **تفاصيل التحذيرات:**\n\n${details}` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    const imgs=list.filter(w=>w.daleel).map(w=>w.daleel).join('\n'); if(imgs) finalMsg+=`\n\n${imgs}`;
    return message.reply(finalMsg);
  }

  if(lower.startsWith('توبيخات ')){
    const nameIn = content.slice(8).trim(); 
    
    const isAdmin = hasAdminPermissions(message.member);
    if (!isAdmin) {
      return message.reply({
        content: '🔒 **عذراً، يُسمح فقط للإداريين باستخدام هذا الأمر للبحث عن أعضاء آخرين!**',
        allowedMentions: { repliedUser: false }
      });
    }

    if (!nameIn || nameIn.startsWith('_')) {
      return message.reply({
        content: '❌ **خطأ:** يجب أن يكون الأمر بهذه الصيغة: `توبيخاتي Name_surname` (مثال: `robio_iwan`).',
        allowedMentions: { repliedUser: false }
      });
    }

    const parsed = parseName(nameIn); 
    const resolved = await resolveKey(message.guild, parsed);
    let list = warns[message.guild.id]?.[resolved.key] || warns[message.guild.id]?.[nameIn.toLowerCase()] || [];
    
    if(!list.length) {
      return message.reply(`🪖 **البحث التأديبي:** عذراً، لا توجد أي توبيخات مسجلة بحق العسكري المذكور.`);
    }

    let details=''; 
    list.forEach((w,i)=>{ 
      details+=`🔹 **التوبيخ (${i+1}):**\n✍️ **بواسطة :** ${formatMod(w.mod)}\n📝 **السبب :** \`${w.reason}\`\n⏳ **التوقيت :** <t:${Math.floor(w.time/1000)}:f>\n🎥 **الدليل :** \`${w.daleel?'يوجد دليل بالأسفل 📸':'لا يوجد دليل'}\`\n\n`; 
    }); 

    let finalMsg=
      `📋 **⟨ الاستعلام عن توبيخات العسكري ⟩** 📋\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 **العسكري المستعلم عنه :** ${parsed.isMention ? `<@${parsed.id}>` : resolved.display}\n\n` +
      `⚠️ **إجمالي التوبيخات :** \` [ ${list.length} / 3 ] \`\n\n` +
      `📜 **التفاصيل:**\n\n${details}` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    const imgs=list.filter(w=>w.daleel).map(w=>w.daleel).join('\n'); 
    if(imgs) finalMsg+=`\n\n${imgs}`;
    return message.reply(finalMsg);
  }

  if(lower.startsWith('تحذيرات ')){
    const nameIn = content.slice(9).trim(); 

    const isAdmin = hasAdminPermissions(message.member);
    if (!isAdmin) {
      return message.reply({
        content: '🔒 **عذراً، يُسمح فقط للإداريين باستخدام هذا الأمر للبحث عن أعضاء آخرين!**',
        allowedMentions: { repliedUser: false }
      });
    }

    if (!nameIn || nameIn.startsWith('_')) {
      return message.reply({
        content: '❌ **خطأ:** يجب أن يكون الأمر بهذه الصيغة: `توبيخاتي Name_surname` (مثال: `robio_iwan`).',
        allowedMentions: { repliedUser: false }
      });
    }

    const parsed = parseName(nameIn); 
    const resolved = await resolveKey(message.guild, parsed);
    let list = tahdirs[message.guild.id]?.[resolved.key] || tahdirs[message.guild.id]?.[nameIn.toLowerCase()] || [];
    
    if(!list.length) {
      return message.reply(`🪖 **البحث التأديبي:** عذراً، لا توجد أي تحذيرات مسجلة بحق العسكري المذكور.`);
    }

    let details=''; 
    list.forEach((w,i)=>{ 
      details+=`🔹 **التحذير (${i+1}):**\n✍️ **بواسطة :** ${formatMod(w.mod)}\n📝 **السبب :** \`${w.reason}\`\n⏳ **التوقيت :** <t:${Math.floor(w.time/1000)}:f>\n🎥 **الدليل :** \`${w.daleel?'يوجد دليل بالأسفل 📸':'لا يوجد دليل'}\`\n\n`; 
    }); 

    let finalMsg=
      `📋 **⟨ الاستعلام عن تحذيرات العسكري ⟩** 📋\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 **العسكري المستعلم عنه :** ${parsed.isMention ? `<@${parsed.id}>` : resolved.display}\n\n` +
      `⚠️ **إجمالي التحذيرات :** \` [ ${list.length} / 3 ] \`\n\n` +
      `📜 **التفاصيل:**\n\n${details}` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    const imgs=list.filter(w=>w.daleel).map(w=>w.daleel).join('\n'); 
    if(imgs) finalMsg+=`\n\n${imgs}`;
    return message.reply(finalMsg);
  }

  if(lower.startsWith('طرد ')){
    const withoutCmd = content.slice(4).trim();
    const parts = withoutCmd.split(' ');
    if(parts.length < 2) return message.reply('❌ الاستعمال الصحيح: `طرد [الاسم] [السبب]`');
    const nameIn = parts[0]; const reason = parts.slice(1).join(' ');
    const att = message.attachments.first();
    const parsed = parseName(nameIn); const resolved = await resolveKey(message.guild, parsed);
    const kickMsg = await sendKickAnnouncement(resolved.display, reason, `<@${message.author.id}>`, att?.url || null, parsed.isMention, parsed.id);
    return message.reply(kickMsg);
  }

  if(lower.startsWith('توبيخ ') && !lower.startsWith('توبيخات')){
    const withoutCmd = content.slice(6).trim();
    const parts = withoutCmd.split(' ');
    if(parts.length < 2) return message.reply('❌ الاستعمال الصحيح: `توبيخ [الاسم] [السبب] [العدد الاختياري]`');
    
    let nameIn = parts[0];
    let restOfParts = parts.slice(1);
    let countToAdd = 1;

    const lastItem = restOfParts[restOfParts.length - 1];
    if (restOfParts.length >= 2 && !isNaN(lastItem)) {
      countToAdd = parseInt(lastItem);
      restOfParts.pop();
    }

    let reason = restOfParts.join(' ');
    if (!reason) return message.reply('❌ الرجاء كتابة سبب التوبيخ بدقة.');

    const att = message.attachments.first();
    const parsed = parseName(nameIn); 
    const resolved = await resolveKey(message.guild, parsed);
    
    if(!warns[message.guild.id]) warns[message.guild.id]={}; 
    if(!warns[message.guild.id][resolved.key]) warns[message.guild.id][resolved.key]=[];

    for(let i = 0; i < countToAdd; i++){
      warns[message.guild.id][resolved.key].push({
        reason, time: Date.now(), display: resolved.display, mod: `<@${message.author.id}>`, daleel: att?.url || null
      });
    }
    saveAll();
    
    let totalCount = warns[message.guild.id][resolved.key].length;
    let warningNote = totalCount >= 3 ? `\n\n🚨 **⟨ بلاغ قيادي عاجل : ﴾** بلغ المعني الحد الأقصى **[ 3 / 3 ]**، يجب إصدار قرار الطرد حالا من الصفوف!` : '';

    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-MA');
    const timeStr = now.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' });

    let msg = 
      `🦅 **⟨ قيادة أركان الجيش | سجل التوبيخ العسكري ⟩** 🦅\n\n` +
      `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
      `🪖 **العسكري المخالف :** ${parsed.isMention ? `<@${parsed.id}>` : resolved.display}\n\n` +
      `🎖️ **المسؤول المباشر :** <@${message.author.id}>\n\n` +
      `📋 **البند / السبب :** \`${reason}\`\n\n` +
      `⏳ **التوقيت الرسمي :** \`${dateStr} | ${timeStr}\`\n\n` +
      `🎥 **الملف الثبوتي :** ${att ? 'مرفق في الأسفل 📸' : 'لا يوجد دليل مرئي'}\n\n` +
      `⚠️ **المعدل التأديبي التراكمي :** \` [ ${totalCount} / 3 ] \`${warningNote}\n\n` +
      `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`;
    
    if(att) msg += `\n${att.url}`;
    return message.reply(msg);
  }

  if(lower.startsWith('تحذير ') && !lower.startsWith('تحذيرات')){
    const withoutCmd = content.slice(6).trim();
    const parts = withoutCmd.split(' ');
    if(parts.length < 2) return message.reply('❌ الاستعمال الصحيح: `تحذير [الاسم] [السبب]`');
    let nameIn = parts[0]; let reason = parts.slice(1).join(' ');
    const att = message.attachments.first();
    const parsed = parseName(nameIn); const resolved = await resolveKey(message.guild, parsed);
    
    if(!tahdirs[message.guild.id]) tahdirs[message.guild.id]={}; 
    if(!tahdirs[message.guild.id][resolved.key]) tahdirs[message.guild.id][resolved.key]=[];
    
    tahdirs[message.guild.id][resolved.key].push({reason, time:Date.now(), display:resolved.display, mod:`<@${message.author.id}>`, daleel:att?.url||null});
    saveAll();
    let count = tahdirs[message.guild.id][resolved.key].length;
    let warningNote = count >= 3 ? `\n\n⚠️ **تنبيه عملياتي :** استكمل العسكري 3 تحذيرات، يجب رفع العقوبة إلى توبيخ رسمي!` : '';
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-MA');
    const timeStr = now.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' });

    let msg = 
      `⚠️ **⟨ قيادة أركان الجيش | سجل التحذير العسكري ⟩** ⚠️\n\n` +
      `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
      `🪖 **العسكري المعني :** ${parsed.isMention?`<@${parsed.id}>`:resolved.display}\n\n` +
      `🎖️ **المسؤول المباشر :** <@${message.author.id}>\n\n` +
      `📋 **البند / السبب :** \`${reason}\`\n\n` +
      `⏳ **التوقيت الرسمي :** \`${dateStr} | ${timeStr}\`\n\n` +
      `🎥 **الملف الثبوتي :** ${att?'مرفق في الأسفل 📸':'لا يوجد دليل مرئي'}\n\n` +
      `⚠️ **المعدل التأديبي التراكمي :** \` [ ${count} / 3 ] \`${warningNote}\n\n` +
      `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`;
    
    if(att) msg+=`\n${att.url}`; return message.reply(msg);
  }
});

client.on('interactionCreate', async interaction=>{
  if(!interaction.isChatInputCommand()) return;
  try{
    const adminCommands = ['warn', 'tahdir', 'tard', 'unwarn', 'clearwarns', 'untahdir', 'cleartahdirs'];
    if (adminCommands.includes(interaction.commandName)) {
      if (interaction.channelId !== ADMIN_ROOM) {
        return interaction.reply({content: `❌ هذا الأمر مخصص حصرياً لغرفة القيادة والإدارة <#${ADMIN_ROOM}>`, ephemeral: true});
      }
      if (!hasAdminPermissions(interaction.member)) {
        return interaction.reply({content: '❌ ليس لديك صلاحية أو رتبة `Administration` لتنفيذ هذا الأمر.', ephemeral: true});
      }
    }

    if(interaction.commandName==='warn'){
      const nameIn = interaction.options.getString('name',true); 
      const reason = interaction.options.getString('reason',true); 
      const countToAdd = interaction.options.getInteger('count') || 1;
      const att = interaction.options.getAttachment('daleel');
      const parsed = parseName(nameIn); 
      const resolved = await resolveKey(interaction.guild, parsed);
      
      if(!warns[interaction.guildId]) warns[interaction.guildId]={}; 
      if(!warns[interaction.guildId][resolved.key]) warns[interaction.guildId][resolved.key]=[];
      for(let i = 0; i < countToAdd; i++){
        warns[interaction.guildId][resolved.key].push({
          reason, time:Date.now(), display:resolved.display, mod:`<@${interaction.user.id}>`, daleel:att?.url||null
        });
      }
      saveAll();
      
      let totalCount = warns[interaction.guildId][resolved.key].length;
      let warningNote = totalCount >= 3 ? `\n\n🚨 **⟨ بلاغ قيادي عاجل : ﴾** بلغ المعني الحد الأقصى **[ 3 / 3 ]**، يجب إصدار قرار الطرد حالا من الصفوف!` : '';

      const now = new Date();
      const dateStr = now.toLocaleDateString('ar-MA');
      const timeStr = now.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' });

      let msg = 
        `🦅 **⟨ قيادة أركان الجيش | سجل التوبيخ العسكري ⟩** 🦅\n\n` +
        `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
        `🪖 **العسكري المخالف :** ${parsed.isMention ? `<@${parsed.id}>` : resolved.display}\n\n` +
        `🎖️ **المسؤول المباشر :** <@${interaction.user.id}>\n\n` +
        `📋 **البند / السبب :** \`${reason}\`\n\n` +
        `⏳ **التوقيت الرسمي :** \`${dateStr} | ${timeStr}\`\n\n` +
        `🎥 **الملف الثبوتي :** ${att ? 'مرفق في الأسفل 📸' : 'لا يوجد دليل مرئي'}\n\n` +
        `⚠️ **المعدل التأديبي التراكمي :** \` [ ${totalCount} / 3 ] \`${warningNote}\n\n` +
        `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`;
      
      if(att) msg += `\n${att.url}`;
      return interaction.reply({content: msg});
    }

    if(interaction.commandName==='tard'){
      const nameIn = interaction.options.getString('name',true); 
      const reason = interaction.options.getString('reason',true); 
      const att = interaction.options.getAttachment('daleel');
      const parsed = parseName(nameIn); 
      const resolved = await resolveKey(interaction.guild, parsed);
      const kickMsg = await sendKickAnnouncement(resolved.display, reason, `<@${interaction.user.id}>`, att?.url || null, parsed.isMention, parsed.id);
      return interaction.reply({content: kickMsg});
    }
    
    if(interaction.commandName==='tahdir'){
      const nameIn = interaction.options.getString('name',true); 
      const reason = interaction.options.getString('reason',true); 
      const att = interaction.options.getAttachment('daleel');
      const parsed = parseName(nameIn); const resolved = await resolveKey(interaction.guild, parsed);
      
      if(!tahdirs[interaction.guildId]) tahdirs[interaction.guildId]={}; 
      if(!tahdirs[interaction.guildId][resolved.key]) tahdirs[interaction.guildId][resolved.key]=[];
      
      tahdirs[interaction.guildId][resolved.key].push({reason, time:Date.now(), display:resolved.display, mod:`<@${interaction.user.id}>`, daleel:att?.url||null});
      saveAll();
      let count = tahdirs[interaction.guildId][resolved.key].length;
      let warningNote = count >= 3 ? `\n\n⚠️ **تنبيه عملياتي :** استكمل العسكري 3 تحذيرات، يجب رفع العقوبة إلى توبيخ رسمي!` : '';
      
      const now = new Date();
      const dateStr = now.toLocaleDateString('ar-MA');
      const timeStr = now.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' });

      let msg = 
        `⚠️ **⟨ قيادة أركان الجيش | سجل التحذير العسكري ⟩** ⚠️\n\n` +
        `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
        `🪖 **العسكري المعني :** ${parsed.isMention?`<@${parsed.id}>`:resolved.display}\n\n` +
        `🎖️ **المسؤول المباشر :** <@${interaction.user.id}>\n\n` +
        `📋 **البند / السبب :** \`${reason}\`\n\n` +
        `⏳ **التوقيت الرسمي :** \`${dateStr} | ${timeStr}\`\n\n` +
        `🎥 **الملف الثبوتي :** ${att?'مرفق في الأسفل 📸':'لا يوجد دليل مرئي'}\n\n` +
        `⚠️ **المعدل التأديبي التراكمي :** \` [ ${count} / 3 ] \`${warningNote}\n\n` +
        `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`;
      
      if(att) msg+=`\n${att.url}`; return interaction.reply({content:msg});
    }

    if(interaction.commandName==='mywarns' || interaction.commandName==='warns'){
      const nameIn = interaction.options.getString('name'); 
      if(nameIn && !hasAdminPermissions(interaction.member)){
        return interaction.reply({content: '🔒 **عذراً، يُسمح فقط للإداريين باستخدام هذا الأمر للبحث عن أعضاء آخرين!**', ephemeral: true});
      }
      let targetDisplay=''; let list=[];
      if(!nameIn){ 
        targetDisplay=`<@${interaction.user.id}>`; 
        list=warns[interaction.guildId]?.[interaction.user.id]||warns[interaction.guildId]?.[(interaction.member?.displayName||interaction.user.username).toLowerCase()]||[]; 
      } else { 
        const parsed=parseName(nameIn); const resolved=await resolveKey(interaction.guild,parsed); 
        if(parsed.isMention){ targetDisplay=`<@${parsed.id}>`; list=warns[interaction.guildId]?.[parsed.id]||[]; } 
        else { targetDisplay=resolved.display; list=warns[interaction.guildId]?.[nameIn.toLowerCase()]||warns[interaction.guildId]?.[resolved.key]||[]; } 
      }
      if(!list.length){ 
        if(!nameIn || nameIn === `<@${interaction.user.id}>` || nameIn === interaction.user.id){
          return interaction.reply({content:`🛡️ **السجل التوبيخي:** سجلُك نظيف تماماً ومثالي (${targetDisplay})، ليس لديك أي توبيخ. (0/3)`});
        }
        return interaction.reply({content:`❌ العسكري ${targetDisplay} ليس لديه أي توبيخ مسجل في السجل العسكري.`}); 
      }
      let details=''; list.forEach((w,i)=>{ details+=`🔹 **التوبيخ (${i+1}):**\n✍️ **بواسطة :** ${formatMod(w.mod)}\n📝 **السبب :** \`${w.reason}\`\n⏳ **التوقيت :** <t:${Math.floor(w.time/1000)}:f>\n\n`; });
      let finalMsg=`📋 **[ السجل التوبيخي للعسكري ]**\n\n👤 **المستعلم عنه :** ${targetDisplay}\n\n⚠️ **المعدل التراكمي :** \` [ ${list.length} / 3 ] \`\n\n📜 **التفاصيل:**\n\n${details}`;
      const imgs=list.filter(w=>w.daleel).map(w=>w.daleel).join('\n'); if(imgs) finalMsg+=`\n\n${imgs}`;
      return interaction.reply({content:finalMsg});
    }

    if(interaction.commandName==='mytahdirs' || interaction.commandName==='tahdirs'){
      const nameIn = interaction.options.getString('name'); 
      if(nameIn && !hasAdminPermissions(interaction.member)){
        return interaction.reply({content: '🔒 **عذراً، يُسمح فقط للإداريين باستخدام هذا الأمر للبحث عن أعضاء آخرين!**', ephemeral: true});
      }
      let targetDisplay=''; let list=[];
      if(!nameIn){ 
        targetDisplay=`<@${interaction.user.id}>`; 
        list=tahdirs[interaction.guildId]?.[interaction.user.id]||tahdirs[interaction.guildId]?.[(interaction.member?.displayName||interaction.user.username).toLowerCase()]||[]; 
      } else { 
        const parsed=parseName(nameIn); const resolved=await resolveKey(interaction.guild,parsed); 
        if(parsed.isMention){ targetDisplay=`<@${parsed.id}>`; list=tahdirs[interaction.guildId]?.[parsed.id]||[]; } 
        else { targetDisplay=resolved.display; list=tahdirs[interaction.guildId]?.[nameIn.toLowerCase()]||tahdirs[interaction.guildId]?.[resolved.key]||[]; } 
      }
      if(!list.length){ 
        if(!nameIn || nameIn === `<@${interaction.user.id}>` || nameIn === interaction.user.id){
          return interaction.reply({content:`🛡️ **سجل التحذيرات:** سجلُك نظيف وممتاز (${targetDisplay})، ليس لديك أي تحذير. (0/3)`});
        }
        return interaction.reply({content:`❌ العسكري ${targetDisplay} ليس لديه أي تحذير مسجل في السجل العسكري.`}); 
      }
      let details=''; list.forEach((w,i)=>{ details+=`🔹 **التحذير (${i+1}):**\n✍️ **بواسطة :** ${formatMod(w.mod)}\n📝 **السبب :** \`${w.reason}\`\n⏳ **التوقيت :** <t:${Math.floor(w.time/1000)}:f>\n\n`; });
      let finalMsg=`📋 **[ سجل التحذيرات للعسكري ]**\n\n👤 **المستعلم عنه :** ${targetDisplay}\n\n⚠️ **المعدل التراكمي :** \` [ ${list.length} / 3 ] \`\n\n📜 **التفاصيل:**\n\n${details}`;
      const imgs=list.filter(w=>w.daleel).map(w=>w.daleel).join('\n'); if(imgs) finalMsg+=`\n\n${imgs}`;
      return interaction.reply({content:finalMsg});
    }

    if(interaction.commandName==='unwarn'){
      const nameIn = interaction.options.getString('name', true);
      const parsed = parseName(nameIn); const resolved = await resolveKey(interaction.guild, parsed);
      const list = warns[interaction.guildId]?.[resolved.key] || warns[interaction.guildId]?.[nameIn.toLowerCase()] || [];
      if(!list.length) return interaction.reply({content:`❌ العسكري ${resolved.display} ليس لديه أي توبيخ ليتم حذفه.`, ephemeral:true});
      const num = interaction.options.getInteger('number');
      if(num) list.splice(num-1, 1); else list.pop();
      saveAll();
      return interaction.reply({content:`✅ **تم بنجاح:** حذف توبيخ من العسكري ${resolved.display} — الرصيد الحالي: \` [ ${list.length} / 3 ] \``});
    }

    if(interaction.commandName==='clearwarns'){
      const nameIn = interaction.options.getString('name');
      if(!nameIn){ 
        warns[interaction.guildId] = {}; 
        saveAll(); 
        return interaction.reply({content:`🗑️ **إجراء قيادي:** تم مسح وتصفير كافة التوبيخات لجميع أعضاء السيرفر بنجاح تام!`}); 
      }
      const parsed = parseName(nameIn); const resolved = await resolveKey(interaction.guild, parsed);
      const list = warns[interaction.guildId]?.[resolved.key] || warns[interaction.guildId]?.[nameIn.toLowerCase()] || [];
      if(!list.length){
        return interaction.reply({content:`❌ العسكري ${resolved.display} ليس لديه أي توبيخ في سجله!`, ephemeral:true});
      }
      if(warns[interaction.guildId]?.[resolved.key]) warns[interaction.guildId][resolved.key] = [];
      if(warns[interaction.guildId]?.[nameIn.toLowerCase()]) warns[interaction.guildId][nameIn.toLowerCase()] = [];
      saveAll();
      return interaction.reply({content:`🗑️ **تم بنجاح:** تصفير وحذف جميع توبيخات العسكري ${resolved.display}.`});
    }

    if(interaction.commandName==='untahdir'){
      const nameIn = interaction.options.getString('name', true);
      const parsed = parseName(nameIn); const resolved = await resolveKey(interaction.guild, parsed);
      const list = tahdirs[interaction.guildId]?.[resolved.key] || tahdirs[interaction.guildId]?.[nameIn.toLowerCase()] || [];
      if(!list.length) return interaction.reply({content:`❌ العسكري ${resolved.display} ليس لديه أي تحذير ليتم حذفه.`, ephemeral:true});
      const num = interaction.options.getInteger('number');
      if(num) list.splice(num-1, 1); else list.pop();
      saveAll();
      return interaction.reply({content:`✅ **تم بنجاح:** حذف تحذير من العسكري ${resolved.display} — الرصيد الحالي: \` [ ${list.length} / 3 ] \``});
    }

    if(interaction.commandName==='cleartahdirs'){
      const nameIn = interaction.options.getString('name');
      if(!nameIn){ 
        tahdirs[interaction.guildId] = {}; 
        saveAll(); 
        return interaction.reply({content:`🗑️ **إجراء قيادي:** تم مسح وتصفير كافة التحذيرات لجميع أعضاء السيرفر بنجاح!`}); 
      }
      const parsed = parseName(nameIn); const resolved = await resolveKey(interaction.guild, parsed);
      const list = tahdirs[interaction.guildId]?.[resolved.key] || tahdirs[interaction.guildId]?.[nameIn.toLowerCase()] || [];
      if(!list.length){
        return interaction.reply({content:`❌ العسكري ${resolved.display} ليس لديه أي تحذير في سجله!`, ephemeral:true});
      }
      if(tahdirs[interaction.guildId]?.[resolved.key]) tahdirs[interaction.guildId][resolved.key] = [];
      if(tahdirs[interaction.guildId]?.[nameIn.toLowerCase()]) tahdirs[interaction.guildId][nameIn.toLowerCase()] = [];
      saveAll();
      return interaction.reply({content:`🗑️ **تم بنجاح:** تصفير وحذف جميع تحذيرات العسكري ${resolved.display}.`});
    }

  }catch(e){ console.error(e); if(!interaction.replied) interaction.reply({content:'❌ خطأ تقني: '+e.message,ephemeral:true}); }
});

client.login(TOKEN);
