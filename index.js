const version = process.env.npm_package_version
const fs = require('fs')
const moment = require('moment')
const sha512 = require('crypto-js/sha512')
const dotenv = require('dotenv')
dotenv.config()

// Load required classes for express
const path = require('path')
const express = require('express')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const bodyParser = require('body-parser')
const fileUpload = require('express-fileupload')

var subscriptionList = []
var subscribedSubscriptions = {}


const server = express()
const port = Number(process.env.PORT) || 21129
const useSavedPassword = ( process.env.USE_SAVED_PASS === undefined )
    ? true
    : ( process.env.USE_SAVED_PASS == 1 )

// Websocket Service
const ws = require('ws')
const wssPort = port + 1
const wss = new ws.Server({ port: wssPort })
var wsSocket;
var wsHandlers = {}

function wsAddHandler( name, handler )
{
    wsHandlers[name] = handler

}
function wsGetHandler( name )
{
    return ( !!wsHandlers[name] ) ? wsHandlers[name] : undefined
}
function wsSendJSON( data )
{
    if ( !!wsSocket )
        wsSocket.send( JSON.stringify( data ) )
}

// Main connections (used by websocket handlers)
var attAccess;
var attSession;
var attServer;
// The websocket connections to server
var attConsole;
var attSubscriptions;

//Utility helper functions and prototypes
function ts()
{ 
    return "["+ moment().format() +"]"
}

function setAccess( serverId )
{
    var { JsapiAccessProvider } = require('att-websockets/dist/connection')
    attAccess = new JsapiAccessProvider( serverId, attServer )
}

function setConnection( serverName )
{
    var { Connection } = require('att-websockets')
    // requires are cached which prevents instantiation
    // so remove the cache entry after loading
    delete require.cache[require.resolve('att-websockets')]

    attConsole = new Connection( attAccess, serverName )
    attConsole.onError = ( e ) => {
        console.log( e )
        throw( e )
    }
}

function setSubscriptionsConnection( serverName )
{
    var { Connection } = require('att-websockets')
    delete require.cache[require.resolve('att-websockets')]

    attSubscriptions = new Connection( attAccess, serverName )
    attSubscriptions.onError = ( e ) => {
        console.log( e )
        throw( e )
    }
    attSubscriptions.onMessage = ( message ) => {
        if ( !!wsSocket )
        {
            wsSendJSON( message )
        }
    }
}


function setATTSession( )
{
    var { Sessions, Servers } = require('alta-jsapi')    
    attSession = Sessions
    attServer = Servers    
}

function authenticated( req )
{
    return  ( req.session !== undefined )
            && !!req.session.userAuthenticated
            && ( attSession !== undefined )
            && attSession.getUserId()
}

// This middleware handles passing errors in async functions back to express
const asyncMid = fn => 
    (req, res, next) => {
        let username = req.session.alta_username;
        console.log( ts() +" "+ req.sessionID +"  "+ req.method +"  "+ req.path +"  "+ username )
        Promise.resolve(fn( req, res, next ))
        .catch( next )
    }


server.set('views', path.join(__dirname, 'views'))
server.set('view engine', 'pug')
server.use( express.static(path.join(__dirname, "public")))
server.use( cookieParser() )
server.use( fileUpload() )
server.use( bodyParser.urlencoded({ extended: false }) )
server.use( bodyParser.json() )
server.use( session({
        secret: 'RTHV6fzTyb31rHUIETuX', 
        resave: false, 
        saveUninitialized: true
    }))

// WebSocket connections
wss.on('connection',  socket => {
    wsSocket = socket
    socket.on('message', message => {
        console.log("websocket message: "+ message )
        if ( message == "ping" )
        {
            wsSendJSON( { message : "pong", action: "test" } )
        } else {
            // Find and call a handler for the specified action type
            if ( !!attConsole )
            {
                try {
                    let data = JSON.parse( message )
                    let handler = wsGetHandler( data.action )
                    if ( !!handler ) 
                    {
                        handler( data )
                    } else {
                        console.log( "Unknown WebSocket handler: "+ data.action )
                    }
                } catch ( e ) {
                    wsSendJSON({ error: e })
                }
            } else {
                wsSendJSON({ result: 'Fail', error: 'No console connected' })
            }
        }
    })
})

server.get('/', ( req, res ) => {
    if ( authenticated( req ) )
    {
        res.redirect('/servers')
    } else {
        res.redirect('/login')
    }
        
})

server.get('/login', ( req, res ) => {
    console.log( "login")
    let savedLogin = { show:'false', 'checked': '', 'username': null, 'password': null }
    if ( useSavedPassword )
    {
        savedLogin.show = 'true'
        let credData = loadCredData()
        if ( !!credData.username && !!credData.password )
        {
            savedLogin.checked = 'checked'
            savedLogin.username = credData.username
            savedLogin.password = 'xxxxxxxxxxxx'
        }
    }
    if ( !!req.query.error )
    {
        res.render('login', { version: version, error: req.query.error, 'savedLogin': savedLogin })
    } else {
        res.render('login', { version: version, error: false, 'savedLogin': savedLogin })
    }
})

server.post('/login', asyncMid( async(req, res, next) => {
    let lUsername = req.body.username
    let lPassword = req.body.password
    let hashPassword = sha512(lPassword).toString()
    let savePass = req.body.savePassword

    if ( useSavedPassword )
    {
        if ( savePass )
        {
            console.log( "processing creds")
            let credData = {}
            try {
                credData = loadCredData()
            } catch ( e ) {
                console.log( "error loading credentials.json: "+ e.message )
            }
            credData.username = lUsername
            if ( lPassword == 'xxxxxxxxxxxx' )
            {
                hashPassword = credData.password
            } else {
                credData.password = hashPassword
            }
            saveCredData( credData )
        } else {
            saveCredData({})
        }

    }    
    lPassword = hashPassword

    let resp = await attLogin( lUsername, lPassword, req );
    if ( resp.authenticated == true )
    {
        req.session.userAuthenticated = true
        req.session.alta_username = attSession.getUsername();
        res.redirect('/')
        return
    }
    res.redirect( 'login?error='+ resp.error )
}))

server.get('/servers', asyncMid( async (req, res, next) => {
    if( authenticated( req ) )
    {
        var servers = await attServer.getConsoleServers()
        console.log( servers )
        if ( !!servers )
        {
            if ( !!req.query.error )
            {
                res.render("servers", { error: ( !!req.query.error ) ? req.query.error : null, serverList: servers })
                return
            } else {
                res.render("servers", { serverList: servers })
                return
            }
        }
    } else {
        res.redirect('/login?error=Logged out')
    }
}))

server.post('/servers', asyncMid( async(req, res, next) =>{
    if ( authenticated(req) )
    {
        var servers = await attServer.getConsoleServers();
        var serverId = req.body.selectedServer;
        var selectedServer = servers.find( item => item.id.toString() == serverId )
        console.log( req.body )
        console.log( selectedServer )

        try {
            var details = await attServer.joinConsole( serverId )
            console.log( details )
        } catch (e) {
            console.log("Error connecting to server:"+ e.message)
            res.redirect('/servers?error='+ e.message )
            return
        }

        if ( details.allowed )
        {
            console.log( "Connecting to server: "+ selectedServer.name )
            setAccess( serverId )
            setConnection( selectedServer.name )            
            setSubscriptionsConnection( selectedServer.Name )
            try {
                console.log( "Connecting Console handler")
                await attConsole.open()
            } catch ( e ) {
                console.log( "Error attaching to console: "+ e.message )
                return
            }
            try {
                console.log( "Connecting Subscriptions handler")
                await attSubscriptions.open()
            } catch ( e ) {
                console.log( "Error attaching to Subscriptions handler: "+ e.message )
                return
            }
            console.log("Connected to server: "+ selectedServer.name )
            res.redirect('/control?serverName='+ selectedServer.name )
            return
        } else {
            console.log("Error connecting to server: ")
            console.log( details )
            res.redirect('/servers?error='+ details.message )
            return
        }
    } else {
        res.redirect('/login?error=Logged out')
    }
}))

server.get('/control', asyncMid( async ( req, res, next ) => {
    if ( authenticated( req ))
    {

        let userId = attSession.getUserId()
        let userName = attSession.getUsername()
        let sname = "Not connected";
        if ( !!req.query.serverName ) {
            sname = req.query.serverName
        }
        
        try {
            await loadSubscriptions(req)
            //console.log( subscriptionList )
            console.log( "rendering control" )
            res.render("control", { version: version, serverUserId: userId, serverUsername: userName, serverName: sname, subscriptions: subscriptionList, subscribed: subscribedSubscriptions })
            return
        } catch ( e ) {
            console.log( e )
            res.redirect('/login?error=Server error')
            return
        }
    } else {
        res.redirect('login?error=Logged out')
    }
}))

wsAddHandler('server_time_get', async(data) => {
    attSubscriptions.onMessage = ( message ) => {
        switch( message.data.Command.FullName )
        {
            case "time.":
                console.log( message )
                wsSendJSON({ 'result': 'OK', time: message.data.Result, data: data })
            break
        }
    }
    await attSubscriptions.send('time')
})

// attSubscription websocket controls
wsAddHandler( 'subscribe', async ( data ) => {
    attSubscriptions.onMessage = ( message ) => {
        if ( !!wsSocket )
        {
            wsSendJSON( message )
        }
    }
    if ( !!data.subscription && !subscribedSubscriptions[ data.subscription ] == true )
    {
        subscribedSubscriptions[ data.subscription ] = true
        await attSubscriptions.send("websocket subscribe "+ data.subscription )
    }
})

wsAddHandler( 'unsubscribe', async ( data ) => {
    attSubscriptions.onMessage = ( message ) => {
        if ( !!wsSocket )
        {
            wsSendJSON( message )
        }
    }
    if ( !!data.subscription && subscribedSubscriptions[ data.subscription ] == true )
    {
        subscribedSubscriptions[ data.subscription ] = false
        await attSubscriptions.send("websocket unsubscribe "+ data.subscription )
    }
})

// Subscription socket controls
var wsMap = {}
wsAddHandler( 'send_command', async ( data ) => {
    attSubscriptions.onMessage = ( message ) => {
        if ( !!wsSocket )
        {
            wsSendJSON( message )
        }
    }
    // Send an arbitrary command to the server
    console.log( "Sending command: ", data.command )
    // Send through the subscriptions channel so it can be logged properly
    await attSubscriptions.send( data.command )
})

wsAddHandler( 'player_set_home', async (data) => {
    console.log( `player_set_home`, data )
    let locData = data.data
    let player = locData.player
    let destination = locData.destination
    let pos =  {
        x: ( !!locData.position.x ) ? locData.position.x : '0',
        y: ( !!locData.position.y ) ? locData.position.y : '0',
        z: ( !!locData.position.z ) ? locData.position.z : '0'
    }


    attConsole.onMessage = async ( message ) => {
        console.log( `player_set_home message: `, message )
        if ( !!message.data.Command )
        {
            switch( message.data.Command.FullName )
            {
                case "player.detailed":
                    let npos = message.data.Result.Position
                    console.log(`"${npos[0]},${npos[1]},${npos[2]}"`)
                    console.log( `new player home position: ${player} `, npos )
                    await attConsole.send(`player set-home ${player} "${npos[0]},${npos[1]},${npos[2]}"`)
                break

                case "player.set-home":
                    console.log( "player home set: ", message )
                    wsSendJSON({'result': 'OK', data: data })
                break
            }
        }
    }

    switch( destination )
    {
        case "PlayerLoc":
            // Retrieve the current location of the player and use this value
            await attConsole.send(`player detailed ${player}`)
        break

        case "MyLoc":
            // Retrieve my location and use this value
            await attConsole.send(`player detailed ${attSession.getUsername()}`)
        break

        case "Respawn":
            // Reset the value by specifying no location
            await attConsole.send(`player set-home ${player}`)
        break

        case "Exact":
            // Use the specified location
            console.log(`player set-home ${player} ${pos.x},${pos.y},${pos.z}`)
            await attConsole.send(`player set-home ${player} "${pos.x},${pos.y},${pos.z}"`)
        break
    }
})

// TODO: replace these with websocket handlers
server.post('/ajax', asyncMid( async( req, res, next ) => {
    console.log( req.body )
    let response = {}
    let command = undefined;
    let responseSent = false;
    let userId = attSession.getUserId()
    if ( authenticated( req ) )
    {
        try {
            if ( !!attConsole )
            {
                attConsole.onMessage = ( message ) => {
                    console.log( message, message.data.Result )
                    let data = {}
                    if ( !!message.data )
                    {
                        data = message.data
                    }
                    if ( !!data.Command && 
                            ( data.Command.FullName != 'select.' || req.body.action == "select_prefab" )
                       )
                    {
                        let result = ( !!message.data.Exception ) ? 'Fail' : 'OK'
                        response = {
                            'result' : result,
                            'data' : data
                        }
                        if ( !responseSent )
                        {
                            responseSent = true;
                            return res.send( response )
                        }
                    }
                }
            } else {
                return res.send({ 'result' : 'Fail' })
            }

            switch( req.body.action )
            {
                case "get_server_config":
                    command = "settings list server"
                    console.log( command )
                    await attConsole.send( command )
                return;

                case "set_server_config":
                    let parameter = ( !!req.body.name ) ? req.body.name : ''
                    let value = ( !!req.body.value ) ? req.body.value : ''
                    if ( !!parameter && !!value )
                    {
                        switch( parameter )
                        {
                            case "ServerTime":
                                console.log( "set server time: ", value)
                                let timeValue = value.replace(/:/,'.')
                                command = `time set ${timeValue}`
                            break
                            default:
                                command = "settings changeSetting server "+ parameter +" "+ value
                            break
                        }
                        console.log( command )
                        await attConsole.send( command )
                    } else {
                        res.send({'result':'Fail'})
                    }
                return;

                case "get_player_config":
                    if ( !!req.body.player )
                    {
                        userId = req.body.player 
                    }
                    command = "player list-stat "+ userId
                    console.log( command )
                    await attConsole.send( command )
                return;

                case "get_player_stat":
                    // not yet supported
                    let stat = ( !!req.body.name )
                        ? req.body.name
                        : 'health'
                    let player = ( !!req.body.player )
                        ? req.body.player
                        : userId
                    command = `player check-stat ${player} ${stat}`
                    console.log( command )
                    await attConsole.send( command )
                return;

                case "set_player_stat":
                    if ( !!req.body.name && !!req.body.value )
                    {
                        let player = ( !!req.body.player )
                            ? req.body.player
                            : userId

                        let statName = req.body.name
                        let statVal = req.body.value
                        switch( statName ) {
                            case "health":
                                if ( statVal <= 0 ) statVal = 0.1
                            break
                        }
                        command = `player set-stat ${player} ${statName} ${statVal}`
                        console.log( command )
                        await attConsole.send( command )
                    } else {
                        res.send({'result': 'Fail'})
                    }
                return;

                case "set_player_godmode":
                    let gmplayer = ( !!req.body.player )
                        ? req.body.player
                        : userId
                    let gmstate = (req.body.value == "true")
                    command = `player god-mode ${gmplayer} ${gmstate}`
                    console.log( command )
                    await attConsole.send( command )
                return
                case "set_player_climbing":
                    let cplayer = ( !!req.body.player )
                        ? req.body.player
                        : userId
                    let cstate = (req.body.value == "true")
                    command = `player set-unlock ${cplayer} 'Climbing Unlock' ${cstate}`
                    console.log( command )
                    await attConsole.send( command )
                return
                case "get_player_list":
                    command = "player list"
                    console.log( command )
                    await attConsole.send( command )
                return

                case "teleport_players":
                    let players = req.body.players
                    let destination = req.body.destination
                    command = "player teleport "+ players +" "+ destination
                    console.log( command )
                    await attConsole.send( command )
                return;

                case "send_message":
                    if ( !!req.body.players )
                    {
                        let players = req.body.players
                        let message = req.body.message
                        let duration = req.body.duration
                        command = 'player message '+ players +' "'+ message +'" '+ duration
                        console.log( command )
                        await attConsole.send( command )
                    } else {
                        res.send({'result':'Fail'})
                    }
                return;

                case "player_kill":
                    if ( !!req.body.player )
                    {
                        command = "player kill "+ req.body.player
                        console.log( command )
                        await attConsole.send( command )
                    } else {
                        res.send({'result': 'Fail'})
                    }
                return;

                case "player_kick":
                    if ( !!req.body.player )
                    {
                        command = "player kick "+ req.body.player
                        console.log( command )
                        await attConsole.send( command )
                    } else {
                        res.send({'result': 'Fail'})
                    }
                return;

                case "player_level_up_mining":
                    if ( !!req.body.player )
                    {
                        command = "player progression pathlevelup "+ req.body.player + " Mining"
                        console.log( command )
                        await attConsole.send( command )
                    } else {
                        res.send({'result': 'Fail'})
                    }
                    console.log(`${req.body.player} Levelup in Mining`)
                return;

                case "player_level_up_woodcutting":
                    if ( !!req.body.player )
                    {
                        command = "player progression pathlevelup "+ req.body.player + " WoodCutting"
                        console.log( command )
                        await attConsole.send( command )
                    } else {
                        res.send({'result': 'Fail'})
                    }
                    console.log(`${req.body.player} Levelup in WoodCutting`)
                return;

                case "player_level_up_melee":
                    if ( !!req.body.player )
                    {
                        command = "player progression pathlevelup "+ req.body.player + " Melee"
                        console.log( command )
                        await attConsole.send( command )
                    } else {
                        res.send({'result': 'Fail'})
                    }
                    console.log(`${req.body.player} Levelup in Melee`)
                return;

                case "player_level_up_ranged":
                    if ( !!req.body.player )
                    {
                        command = "player progression pathlevelup "+ req.body.player + " Ranged"
                        console.log( command )
                        await attConsole.send( command )
                    } else {
                        res.send({'result': 'Fail'})
                    }
                    console.log(`${req.body.player} Levelup in Ranged`)
                return;

                case "player_level_up_forging":
                    if ( !!req.body.player )
                    {
                        command = "player progression pathlevelup "+ req.body.player + " Forging"
                        console.log( command )
                        await attConsole.send( command )
                    } else {
                        res.send({'result': 'Fail'})
                    }
                    console.log(`${req.body.player} Levelup in Forging`)
                return;

                default:
                    res.send({'result':'Unknown Endpoint'})
                return;

            }
        } catch ( e ) {
            console.log( e.message )
            return
        }
    } else {
        console.log("not authenticated")
        res.send( { "err": "not authenticated" } )
    }
}))

server.listen( port, (err) => {
    if ( err ) {
        console.log("Error starting server:")
        return console.log( err )
    }

    console.log("Server is started on port: "+ port)
})


// ATT Connection
async function attLogin( username, hashPassword, req ) 
{
    console.log( "Connecting to ATT" )
    let resp = {}
    setATTSession()
    await attSession.loginWithUsername( username, hashPassword )
        .then(() => {
            if ( attSession.getUserId() ) {
                console.log( "Connected as "+ attSession.getUsername() )
                resp.authenticated = true;        
            }
        })
        .catch( (err) => { 
            console.log( err )
            let errMsg = JSON.parse( err.error )
            console.log( "Authentication error: "+ errMsg.message ) 
            resp.error = errMsg.message
        });
    return resp
}

async function loadSubscriptions( req )
{
    return new Promise( (resolve, reject) => {
        let conn = attSubscriptions
        if ( !!conn )
        {
            conn.onMessage = (data) => {
                if ( !!data.data.Result && data.data.Result.length > 0 )
                {
                    subscriptionList = data.data.Result
                    return resolve()
                } else {
                    return reject()
                }
            }
            console.log( "loadSubscriptions getting subscription targets")
            conn.send("websocket subscriptions")
        }
    })
}

function loadCredData()
{
    console.log( "loadCredData" )
    let parsed = {}
    try {
        let raw = fs.readFileSync( path.join(__dirname, 'data/credentials.json') )
        parsed = JSON.parse( raw )
    } catch ( e ) {
        console.log( "error reading data/credentials.json: "+ e.message )        
    }
    return parsed
}

function saveCredData( creds )
{
    console.log( "saveCredData" )
    console.log( creds )
    fs.writeFile(path.join(__dirname, 'data/credentials.json'), JSON.stringify( creds, null, 4 ), function( err ) {
        if ( err )
        {
            console.log( err );
        } else {
            console.log( "New credentials.json saved" );
        }
    });   
}