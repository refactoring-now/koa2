var net = require("net")
for(k in net)
	global[k] = net[k]
