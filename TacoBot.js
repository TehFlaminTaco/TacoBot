scrp = document.createElement("script"); scrp.setAttribute("src","https://daurnimator.github.io/lua.vm.js/lua.vm.js"); $(document.body).append(scrp);
var lastMessage=0;

setTimeout(function(){
	emscripten.print = function(out){
		out = out.replace(/\\n/g,"\n");
		console.log(out);
		document.getElementById("input").value = out;
		$("#codify-button").click();
		$("#sayit-button").click();
	}
	emscripten.read = function(){
		var a = $("#chat").children();
		var latest = a[a.length-1];
		if(latest.getAttribute("class")!="system-message-container"){
			var messages = $($(latest).children()[1]).children();
			var latestMessage = messages[messages.length-1];
			if (latestMessage != lastMessage){
				var content = $(latestMessage).find(".content");
				if(content.find("pre").length>0){
					return null;
				}
				var text = content.text();
				if(!(/^Tacobot: `.*`$/).test(text)){
					return text;
				}
			}
			lastMessage = latestMessage;
		}
		return null;
	}

	L.execute(`
math.randomseed(os.time())
Brain = {}

local oprint = print
function print(...)
	local t = {...}
	for k, v in pairs(t) do
		t[k] = v:gsub("\\n","\\\\n")
	end
	return oprint(table.unpack(t))
end

print("Tacobot has woken up. Good morning!\nType !help for command")

TalkHeader = "Hey Tacobot,"
CommandHeader = "!"

LastMessage = ''
function Update()
	local txt = window.emscripten.read()
	if type(txt)=='string' and txt~=LastMessage and (not txt:match('^%s*$')) then
		LastMessage = txt
		if txt:sub(1,#CommandHeader)==CommandHeader then
			RunCommand(txt:sub(#CommandHeader+1))
			return
		end
		txt = txt:gsub('@','')
		Learn('<START> '..txt:gsub(TalkHeader..'%s*','')..' <END>')
		if(txt:sub(1,#TalkHeader)==TalkHeader)then
			ProduceText()
		end
	end
end

Commands = {}
Commands.echo = print
Commands.help = function()
	local s = ""
	for k, v in pairs(Commands) do
		s = s .. k .. ":\\n" .. Descriptions[k] .. "\\n\\n"
	end
	print(s)
end
Commands.exec = function(str)
	local olg = _ENV
	_ENV = setmetatable({},{__index = olg})
	local b, e = load(str)
	if b then b()
	elseif e then print(e) end
	_ENV = olg
end


Descriptions = {}
Descriptions.echo = "Make Tacobot repeat what was input."
Descriptions.help = "List all of the functions Tacobot knows."
Descriptions.exec = "Run the input as a Lua Script. <WARNING VOLITILE>"

function RunCommand(str)
	local t = {}
	local c = 1
	local st = ""
	local inStr = false
	for s in str:gmatch"." do
		if (not inStr) and s:match"%s" then
			t[c] = st
			c = c + 1
			st = ""
		elseif s == '"' then
			inStr = not inStr
		else
			st = st .. s
		end
	end
	t[c] = st

	local comm = table.remove(t,1)
	if Commands[comm] then
		Commands[comm](str:match"%S+(.*)",t)
	end
end

function Learn(inText)
	for inText in inText:gmatch'<START>.-<END>' do
		local words = {}
		for s in inText:gmatch'%S+' do
			words[#words+1] = s
		end

		Brain[words[1] ] = (Brain[words[1] ] or {})
		Brain[words[1] ][#Brain[words[1]]+1] = words[2]


		for i=3, #words do
			local s = words[i-2]..' '..words[i-1]
			local t = Brain[s] or {}
			t[#t+1] = words[i]
			Brain[s] = t
		end
	end
end


function ProduceText()
	local token = {'<START>'}
	local builtMessage = ''
	repeat
		while true do
			local str = table.concat(token,' ')
			local n = math.random(#Brain[str])
			local nxt = Brain[str][n]
			token[#token+1] = nxt
			while #token > 2 do
				table.remove(token,1)
			end
			if nxt == '<END>' then
				break
			end
			builtMessage = builtMessage .. nxt .. ' '
		end
	until #builtMessage < 450
	print(builtMessage)
end
`);

},5000);
setInterval(function(){
	L.execute("Update()");
}, 2500)