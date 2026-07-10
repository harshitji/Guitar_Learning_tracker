-- Guitar Dashboard Launcher
-- Prepends /usr/local/bin to PATH so npm can locate node

property projectDir : "/Users/harshitdubey/WorkSpace/guitar-dashboard"
property serverURL : "http://localhost:3001"
property dashboardURL : "http://localhost:5173"
property logFile : "/tmp/guitar-dashboard.log"

on run
	-- Check if already running
	set isRunning to false
	try
		set curlResult to do shell script "curl -s --connect-timeout 1 " & serverURL & "/api/roadmap > /dev/null 2>&1; echo $?"
		if curlResult is "0" then
			set isRunning to true
		end if
	end try
	
	if isRunning then
		open location dashboardURL
		display notification "Dashboard already running — opening browser." with title "🎸 Guitar Tracker"
		return
	end if
	
	-- Start servers in background setting the PATH environment variable
	do shell script "export PATH=\"/usr/local/bin:$PATH\" && cd " & quoted form of projectDir & " && npm run dev > " & logFile & " 2>&1 &"
	
	-- Wait for server to be ready (poll up to 25 seconds)
	set serverReady to false
	repeat 25 times
		delay 1
		try
			set curlResult to do shell script "curl -s --connect-timeout 1 " & serverURL & "/api/roadmap > /dev/null 2>&1; echo $?"
			if curlResult is "0" then
				set serverReady to true
				exit repeat
			end if
		end try
	end repeat
	
	if serverReady then
		open location dashboardURL
		display notification "Dashboard is ready!" with title "🎸 Guitar Tracker" subtitle "Opened at localhost:5173"
	else
		set logContents to do shell script "tail -10 " & logFile & " 2>/dev/null || echo 'No log'"
		display dialog "Server failed to start." & return & return & "Last log:" & return & logContents buttons {"OK"} default button "OK" with icon caution
	end if
end run
