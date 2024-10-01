var selectedPrefabId = null;
var selectedPlayerName = null;
var selectedConfigForm = null;
var currentPlayersList = null;

$(document).ready(() => {
    $("i").each( ( ind, img ) => {
        let title = $(img).attr('title')
        if ( title )
        {
            $(img).attr('alt', title )
        }
    })

    $(".ServerListItem").click( (e) => {
        let self = $(e.target);
        if ( $(self).hasClass('ServerListItemName') ) self = $(self).parent()
        if ( $(self).hasClass('ServerListItemOnlineCount') ) self = $(self).parent()
        $("#selectedServer").val( $(self).attr('id') )
        $('.ServerListItem').toggleClass('active', false )
        $(self).toggleClass('active')
    })

    $("#CommandTerminalNav").click(( e ) =>{
        console.log("command_terminal")
        $(".topnav").toggleClass("active", false)
        $(e.currentTarget).toggleClass("active")
        $(".Message").hide()
        $("#CommandTerminal").show()
        wsSendJSON({'action':"subscribe"})
    })

    $("#ConfigurePlayersNav").click(( e ) =>{
        console.log( "get_player_list")
        let optSelected = $("#ConfigurePlayersSelect").find("option:selected")
        let playerIsSelected = ( optSelected.val() != "default" )
        selectedPlayerName = ( playerIsSelected ) ? optSelected.text() : null
        selectedPlayerId = ( playerIsSelected ) ? optSelected.val() : null
        loadPlayersOnline( ( playersList ) => {
            selectedConfigForm = "#ConfigurePlayers"
            currentPlayersList = playersList
            let listGroup = $(selectedConfigForm +" div.TeleportPlayers")

            $(selectedConfigForm + " #TeleportToPlayerButton").show()
            $(selectedConfigForm + " #TeleportToSelectedPlayer").hide()
            $(selectedConfigForm + " a#TeleportToDestination").html("Teleport "+ selectedPlayerName )
            $("#ConfigurePlayersSelect")
            .empty()
            .append( $("<option>", { value: "default" }).text("Choose a player..."))
 
            listGroup.empty()
            if ( currentPlayersList.length <= 0 )
            {
                listGroup.append("<a class='list-group-item' name='default'>No players found</a>")
            }
            for ( let i = 0; i < currentPlayersList.length; i++ )
            {
                let player = currentPlayersList[i]
                let selected = ( selectedPlayerId == player.id )
                $("#ConfigurePlayersSelect").append(
                    new Option( player.username, player.id, false, selected )
                )
                listGroup.append("<a class='list-group-item' name='"+ player.id +"'>"+ player.username +"</a>")
            }
            if ( playerIsSelected )
            {
                loadPlayerConfig( selectedPlayerId, "#ConfigurePlayersDialog" )
            }
            $(".topnav").toggleClass('active', false)
            $("#ConfigurePlayersNav").toggleClass("active")
            $(".Message").hide()
            $("#ConfigurePlayers").show()
        })
    })

    $("#ConfigurePlayersSelect").on('change', ( e ) => {
        let optSelected = $(e.target).find("option:selected")
        if ( optSelected.val() == "default" )
        {
            $("#ConfigurePlayersPlayer").html( "Select a player")
            $("#ConfigurePlayersServerName").hide()
            $("#ConfigurePlayersDialog").hide()
            return
        }
        selectedConfigForm = "#ConfigurePlayers"
        selectedPlayerName = optSelected.text()
        selectedPlayerId = optSelected.val()

        let parent = selectedConfigForm
        $(parent +" #ConfigurePlayersPlayer").html( selectedPlayerName )      
        loadPlayerConfig( selectedPlayerId, "#ConfigurePlayersDialog")

        let playerListGroup = selectedConfigForm + " div.TeleportPlayers"
        $(playerListGroup +" a.list-group-item").removeClass("active")
        $(playerListGroup +" a.list-group-item[name="+ selectedPlayerId +"]").addClass("active")
        $(selectedConfigForm + " a#TeleportToDestination").html("Teleport "+ selectedPlayerName )
        $(selectedConfigForm +" span#TeleportPlayersPlayer").html( selectedPlayerName )

        $("#ConfigurePlayersDialog").show()
    })

    $("#PlayerConfigNav").click( ( e ) => {
        selectedConfigForm = "#PlayerConfig"
        selectedPlayerName = $("input#PlayerConfigUsername").val()
        selectedPlayerId = $("input#PlayerConfigUserId").val()

        console.log( "get player config "+ selectedPlayerId +" : "+ selectedPlayerName )

        loadPlayersOnline( ( playersList ) => {
            console.log( playersList )
            currentPlayersList = playersList
            let listGroup = $(selectedConfigForm +" div.TeleportPlayers")
            listGroup.empty()
            if ( currentPlayersList.length <= 0 )
            {
                listGroup.append("<a class='list-group-item' name='default'>No players found</a>")
            }
            for ( let i = 0; i < currentPlayersList.length; i++ )
            {
                let player = currentPlayersList[i]
                listGroup.append("<a class='list-group-item' name='"+ player.id +"'>"+ player.username +"</a>")
            }

            if ( !!selectedPlayerName )
            {
                loadPlayerConfig( selectedPlayerId, "#PlayerConfig")
            }
        })

        $(selectedConfigForm +" #TradeItemsTag").html("Treat Yo' Self!")
        $(selectedConfigForm + " #TeleportToPlayerButton").hide()
        $(selectedConfigForm + " #TeleportToSelectedPlayer").show()

        $(".topnav").toggleClass("active", false)
        $("#PlayerConfigNav").toggleClass("active")
        $(".Message").hide()
        $("#PlayerConfig").show()  
    })

    $("a.PlayerNav").click(( e ) => {
        let name = e.currentTarget.id
        let parent = selectedConfigForm
        $(parent +" .PlayerNav").toggleClass("active", false)
        $(e.currentTarget).toggleClass("active")
        $(parent +" .PlayerConfigDialog").hide()
        $(parent +" #"+ name).show()
    })

    $("#ConfigureServerNav").click(( e ) =>{
        console.log( "get_server_config")
        $.ajax({
            type: 'post',
            url: '/ajax',
            data: { 'action':'get_server_config' },
            dataType: 'json'
        })
        .done((data) => {
            console.log( data )
            if ( !!data.data.Result )
            {
                let conf = data.data.Result

                $("input.SetServerConfig").each( ( i, elem ) => {
                    console.log( elem )
                    let name = elem.name
                    console.log( "set "+ name +" to "+ conf[name] )
                    $(elem).val( conf[name] )
                })

                $("a.ToggleServerConfig").each( ( i, elem ) => {
                    console.log( elem )                    
                    let name = elem.name
                    console.log( "set "+ name +" to "+ conf[name] )
                    if ( conf[name] )
                        $("#toggle"+ name)
                            .removeClass("fa-toggle-off")
                            .addClass("fa-toggle-on")
                })
            }

            $(".topnav").toggleClass("active", false)
            $("#ConfigureServerNav").toggleClass("active")
            $(".Message").hide()
            $("#ServerConfig").show()
        })
    })

    $("#ServerMessagesNav").click(( e ) => {
        console.log( "server messages" )
        selectedConfigForm = "#ServerMessages"
        loadPlayersOnline( ( playersList ) => {
            currentPlayersList = playersList
            let listGroup = $("#ServerMessages #PlayerMsgPlayers")
            listGroup.empty()
            if ( currentPlayersList.length <= 0 )
            {
                listGroup.append("<a class='list-group-item' name='default'>No players found</a>")
            }
            for ( let i = 0; i < currentPlayersList.length; i++ )
            {
                let player = currentPlayersList[i]
                listGroup.append("<a class='list-group-item' name='"+ player.id +"'>"+ player.username +"</a>")
            }
            $(".topnav").toggleClass("active", false)
            $("#ServerMessagesNav").toggleClass("active")
            $(".Message").hide()
            $("#ServerMessages").show()
        })
    })

    $("#ServerMessages #PlayersMsgDialog").on( 'click', "a.list-group-item", ( e ) =>{
        let parent = "#ServerMessages #PlayerMsgDialog"
        let targetName = $(e.target).attr('name')
        if ( targetName != 'default')
            $(e.target).toggleClass("active")
    })
        
    $("input.SetPlayerConfig").on('input', (e) =>{
        let parent = selectedConfigForm
        let name = e.currentTarget.name
        let value = $(e.currentTarget).val()
        console.log( "range "+ name +" = "+ value )
        $(parent +" a.SetPlayerConfig[name="+ name +"]").show()
        $(parent +" span[name="+ name +"-value]").html( value )
    })

    $("input.SetServerConfig").on('change', (e) => {
        let parent = "#ServerConfig"
        let name = e.currentTarget.name
        console.log( parent )
        $(parent +" a.SetServerConfig[name="+ name +"]").show()
    })

    $("a.SetPlayerConfig").click( (e) => {
        let parent = selectedConfigForm
        let playerId = selectedPlayerId
        let name = e.currentTarget.name;
        let value = $(parent +" input.SetPlayerConfig[name="+name+"]").val()
        console.log( "setstat "+ playerId +" "+ name +" "+ value )
        $.ajax({
            type: 'post',
            url:'/ajax',
            data: {'action': 'set_player_stat', 'player': playerId, 'name': name, 'value': value },
            dataType: 'json'
        }).done( (data) => {
            console.log( data )
            if ( data.result == 'OK')
            {
                flash( e.currentTarget, "20, 255, 20" )
                $(e.currentTarget).fadeOut()
            } else {
                flash( e.currentTarget, "255, 20, 20" )
            }
        })
    })

    $("a.TogglePlayerConfig").click( ( e ) => {
        let parent = selectedConfigForm
        let player = selectedPlayerName
        let playerId = selectedPlayerId
        let name = e.currentTarget.name
        let toggler = $(parent +" #toggle"+name)
        let value = false
        let dataSet = { 'action': 'set_player_stat', 'name': name, 'player': playerId }
        if ( toggler.hasClass('fa-toggle-off') ) {
            $(toggler).removeClass('fa-toggle-off').addClass("fa-toggle-on")
            value = true
        } else {
            $(toggler).removeClass("fa-toggle-on").addClass("fa-toggle-off")
        }
        if ( name == 'godmode' ) {
            dataSet.action = 'set_player_godmode'
        }
        if ( name == 'climbing' ) {
            dataSet.action = 'set_player_climbing'
        }
        if ( toggler.hasClass('numeric') )
        {
            value = ( value ) ? 1 : 0;
        }
        dataSet.value = value
        
        $.ajax({
            type: 'post', url: '/ajax', data: dataSet, dataType: 'json'
        })      
        .done( (data) => {
            console.log( data )
            if ( data.result == 'OK' )
            {
                flash( e.currentTarget, "20, 255, 20" )
            } else {
                if ( toggler.hasClass("fa-toggle-on") ){
                    $(toggler).removeClass("fa-toggle-on").addClass("fa-toggle-off")
                }
                flash( e.currentTarget, "255, 20, 20" )
            }
        })
    })

    $("a.ModPlayerConfig").click( ( e ) =>{
        let parent = selectedConfigForm
        let name = e.currentTarget.name
        let operMinus = $(e.currentTarget).hasClass("minus")
        let operPlus = $(e.currentTarget).hasClass("plus")
        let target = $(parent +" input.SetPlayerConfig[name="+ name +"]")
        let value = newVal = parseFloat(target.val())
        let step = parseFloat( target.attr('step') )// || 1
        let min = parseFloat( target.attr('min') ) || 0
        let max = parseFloat( target.attr('max') ) || 10
        if ( operMinus )
        {
            newVal = value - step
            console.log( name + " minus "+ step +" = "+ newVal )
            if ( newVal < min )
                newVal = min                     
        } else if ( operPlus ) {
            newVal = value + step
            console.log( name + " plus "+ step +" = "+ newVal )
            if ( newVal > max )
                newVal = max
        }
        target.val( newVal )
        $(parent +" a.SetPlayerConfig[name="+ name +"]").show()
    })

    $("a.SetServerConfig").click( ( e ) =>{
        let parent = "#ServerConfig"
        let name = e.currentTarget.name;
        console.log( name )
        let value = $(parent +" input.SetServerConfig[name="+ name +"]").val()
        console.log( value )
        $.ajax({
            type: 'post',
            url: '/ajax',
            data: {'action': 'set_server_config', 'name': name, 'value': value },
            dataType: 'json'
        })
        .done((data) =>{
            console.log( data )
            if ( data.result == 'OK' )
            {
                flash( e.currentTarget, "20, 255, 20")
                $(e.currentTarget).fadeOut()
            } else {
                flash( e.currentTarget, "255, 20, 20")
            }
        })

    })

    $("a.ToggleServerConfig").click( ( e ) => {
        console.log( e.currentTarget )
        let name = e.currentTarget.name
        let toggler = $("#toggle"+ name)
        console.log( toggler )
        console.log( "toggle "+ name )
        let value = false;
        if ( toggler.hasClass('fa-toggle-off') ){
            $(toggler).removeClass("fa-toggle-off").addClass("fa-toggle-on")
            value = true
        } else {
            $(toggler).removeClass("fa-toggle-on").addClass("fa-toggle-off")
        }
        $.ajax({
            type: 'post',
            url: '/ajax',
            data: {'action': 'set_server_config', 'name': name, 'value': value },
            dataType: 'json'
        })
        .done((data) => {
            console.log( data )
            if ( data.result == 'OK' )
                flash( e.currentTarget , "20, 255, 20" )
            else {
                if ( toggler.hasClass("fa-toggle-on") ) {
                    $(toggler).removeClass("fa-toggle-on").addClass("fa-toggle-off")
                }
                flash( e.currentTarget, "255, 20, 20" )
            }
        })
    })

    $("div.TeleportPlayers").on( 'click', "a.list-group-item", ( e ) =>{
        let parent = selectedConfigForm
        let targetName = $(e.target).attr('name')
        if ( targetName != 'default')
            $(e.target).toggleClass("active")

        let parentToActive = parent + " div#PlayerConfigTeleport a.list-group-item.active"
        if ( $(parentToActive).length > 1 )
            $(parent + " #PlayerConfigTeleport #TeleportToPlayer").addClass("disabled")
        else
            $(parent + " #PlayerConfigTeleport #TeleportToPlayer").removeClass("disabled")

        $(parentToActive).each((i, elem) => {
            console.log( $(elem).attr('name') )
        })
    })

    $("#PlayerConfigTeleport select#PlayerHomeSelect").on('change', (e) => {
        let parent = selectedConfigForm
        let optSelected = $(e.target).find("option:selected").val()
        console.log( optSelected )
        if ( optSelected == "Exact" )
        {
            $(parent + " #PlayerHomeExact").show()
        } else {
            $(parent + " #PlayerHomeExact").hide()
        }
    })

    $("#PlayerConfigTeleport a#PlayerSetHomeButton").click( (e) => {
        let parent = selectedConfigForm
        let optSelected = $(parent + " select#PlayerHomeSelect").find("option:selected")
        let position = {
            x: $(parent +" #PlayerHomeX").val(),
            y: $(parent +" #PlayerHomeY").val(),
            z: $(parent +" #PlayerHomeZ").val()
        }
        let player = selectedPlayerId
        let destination = optSelected.val()
        let data = {
            'position' : position,
            'player' : player,
            'destination' : destination
        }
        console.log( "player_set_home: ", data )
        wsSendJSON({ 'action': 'player_set_home', data: data })
    })

    $("#PlayerConfigTeleport a#TeleportToDestination").click(( e ) =>{
        let parent = selectedConfigForm
        let optSelected = $(parent + " select#TeleportDestinations").find('option:selected')
        let players = selectedPlayerId        
        let destination = optSelected.val()

        dataSet = {
            'action':'teleport_players',
            'players': players,
            'destination': destination
        }
        $.ajax({
            type: 'post',
            url: 'ajax',
            data: dataSet,
            dataType: 'json'
        })
        .done( (data) => {
            if ( data.result == 'OK' )
                flash( e.currentTarget, "20, 255, 20")
            else 
                flash( e.currentTarget, "255, 20, 20")
        })
    })

    $("#PlayerConfigTeleport a#TeleportToPlayerButton").click(( e ) => {
        let players = $("input#PlayerConfigUserId").val()
        
        let destination = selectedPlayerId
        if ( !destination )
        {
            flash( e.currentTarget, "255, 20, 20")
            return
        }
        dataSet = {
            'action':'teleport_players',
            'players': players,
            'destination': destination
        }
        $.ajax({
            type: 'post',
            url: '/ajax',
            data: dataSet,
            dataType: 'json'
        })
        .done( (data) => {
            if ( data.result == 'OK' )
            {
                flash( e.currentTarget, "20, 255, 20")
            } else {
                flash( e.currentTarget, "255, 20, 20")
            }
        })
    })

    $("#PlayerConfigTeleport a#TeleportToSelectedPlayer").click(( e ) => {
        let parent = selectedConfigForm
        let players = $("input#PlayerConfigUserId").val()
        
        let parentToActive = parent + " #PlayerConfigTeleport a.list-group-item.active"
        let destination = $(parentToActive).first().attr('name')
        if ( !destination )
        {
            flash( e.currentTarget, "255, 20, 20")
            return
        }
        dataSet = {
            'action':'teleport_players',
            'players': players,
            'destination': destination
        }
        $.ajax({
            type: 'post',
            url: '/ajax',
            data: dataSet,
            dataType: 'json'
        })
        .done( (data) => {
            if ( data.result == 'OK' )
            {
                flash( e.currentTarget, "20, 255, 20")
            } else {
                flash( e.currentTarget, "255, 20, 20")
            }
        })
    })

    $("#PlayerConfigTeleport a#TeleportSelectedToMe").click(( e ) => {
        let parent = selectedConfigForm
        let destination = selectedPlayerId

        let parentToActive = parent + " #PlayerConfigTeleport a.list-group-item.active"
        let playersList = []
        $(parentToActive).each((i, elem) => {
            playersList.push( $(elem).attr('name') )
        })
        let players = playersList.join(',')
        if ( !players )
        {
            flash( e.currentTarget, "255, 20, 20" )
            return
        }
        dataSet = {
            'action': 'teleport_players',
            'players': players,
            'destination': destination
        }
        $.ajax({ type: 'post', url: '/ajax', data: dataSet, dataType: 'json' })
            .done( (data) => {
                if ( data.result == 'OK' )
                {
                    flash( e.currentTarget, "20, 255, 20")
                } else {
                    flash( e.currentTarget, "255, 20, 20")
                }
            })

    })

    $("#PlayerConfigTeleport a#TeleportSelectedToDest").click(( e ) => {
        let parent = selectedConfigForm
        let parentToActive = parent + " #PlayerConfigTeleport a.list-group-item.active"
        let playersList = []
        $(parentToActive).each((i, elem) => {
            playersList.push( $(elem).attr('name') )
        })        
        if ( !playersList.length )
        {
            flash( e.currentTarget, "255, 20, 20")
            return
        }
        let optSelected = $(parent + " select#TeleportDestinations").find('option:selected')
        let destination = optSelected.val()
        console.log( destination )
        if ( !destination )
        {
            flash( e.currentTarget, "255, 20, 20")
            return
        }
        for ( let i = 0; i < playersList.length; i++ )
        {
            dataSet = {
                'action':'teleport_players',
                'players': playersList[i],
                'destination': destination
            }
            $.ajax({ type: 'post', url: '/ajax', data: dataSet, dataType: 'json'})
                .done( (data) => {
                    if ( data.result == 'OK' )
                    {
                        flash( e.currentTarget, "20, 255, 20")
                    } else {
                        flash( e.currentTarget, "255, 20, 20")
                    }
                })
        }
    })

    $("a.minusInt").click( (e) => {
        let parent = selectedConfigForm
        let target = "#"+ e.currentTarget.name
        let step = parseInt( $(parent +" "+ target +"_step").val() ) || 1
        let min = parseInt( $(parent +" "+ target +"_min").val() ) || 0
        let val = parseInt( $(parent +" "+ target).val() )
        let newVal = val - step
        if ( newVal < min )
            newVal = min

        $(parent +" "+ target).val( newVal )
    })

    $("a.plusInt").click( (e) => {
        let parent = selectedConfigForm
        let target = "#"+ e.currentTarget.name
        let step = parseInt( $(parent +" "+ target +"_step").val() ) || 1
        let max = parseInt( $(parent +" "+ target +"_max").val() ) || null
        let val = parseInt( $(parent +" "+ target).val() )
        let newVal = val + step
        if ( !!max && newVal > max )
            newVal = max

        $(parent +" "+ target).val( newVal )
    })

    $("#ServerMessages a#ServerMsgSendBtn").click(( e ) => {
        let parent = "#ServerMessages"
        let message = $(parent +" #ServerMsgMessage").val()
        let duration = parseInt( $(parent + " #ServerMsgDuration").html() )
        if ( message.trim() == '' )
        {
            flash( e.currentTarget, "255, 20, 20")
            return
        }
        dataSet = {
            'action': 'send_message',
            'message': message,
            'duration': duration,
            'players': "*"
        }
        console.log( dataSet )
        $.ajax({ type: 'post', url: '/ajax', data: dataSet, dataType: 'json' })
            .done( (data) => {
                console.log( data )
                if ( data.result == 'OK' )
                {
                    flash( e.currentTarget, "20, 255, 20" )
                } else {
                    flash( e.currentTarget, "255, 20, 20")
                }
            })
    })

    $("#ServerMessages a#PlayerMsgSendBtn").click(( e ) => {
        let parent = "#ServerMessages"
        let message = $(parent +" #PlayerMsgMessage").val()
        let duration = parseInt( $(parent + " #PlayerMsgDuration").html() )

        let parentToActive = parent + " #PlayerMsgPlayers a.list-group-item.active"      
        let playersList = []
        $(parentToActive).each((i, elem) => {
            playersList.push( $(elem).attr('name') )
        })
        let players = playersList.join(',')
        if ( !players || message.trim() == '' )
        {
            flash( e.currentTarget, "255, 20, 20") 
            return
        }
        dataSet = { 
            'action': 'send_message',
            'message': message,
            'duration': duration,
            'players': players
        }
        console.log( dataSet )
        $.ajax({ type: 'post', url: '/ajax', data: dataSet, dataType: 'json' })
            .done( (data) => {
                console.log( data )
                if ( data.result == 'OK' )
                {
                    flash( e.currentTarget, "20, 255, 20" )
                } else {
                    flash( e.currentTarget, "255, 20, 20")
                }
            })
    })

    $("a#PlayerAdminKill").click(( e ) => {
        let player = selectedPlayerId
        dataSet = {
            'action': 'player_kill',
            'player': player
        }
        $.ajax({ type: 'post', url: '/ajax', data: dataSet, dataType: 'json' })
            .done( (data) => {
                console.log( data )
                if ( data.result == 'OK' )
                {
                    flash( e.currentTarget, "20, 255, 20" )
                } else {
                    flash( e.currentTarget, "255, 20, 20")
                }
            })
    })

    $("a#PlayerAdminKick").click(( e ) => {
        let player = selectedPlayerId
        dataSet = {
            'action': 'player_kick',
            'player': player
        }
        $.ajax({ type: 'post', url: '/ajax', data: dataSet, dataType: 'json' })
            .done( (data) => {
                console.log( data )
                if ( data.result == 'OK' )
                {
                    flash( e.currentTarget, "20, 255, 20" )
                } else {
                    flash( e.currentTarget, "255, 20, 20")
                }
            })
    })
    
    $("a#PlayerLevelUp").click(( e ) => {
        let player = selectedPlayerId
        let name = e.currentTarget.name
        if(name == "Mining"){
            dataSet = {
                'action': 'player_level_up_mining',
                'player': player
            }
        }
        if(name == "WoodCutting"){
            dataSet = {
                'action': 'player_level_up_woodcutting',
                'player': player
            }
        }
        if(name == "Melee"){
            dataSet = {
                'action': 'player_level_up_melee',
                'player': player
            }
        }
        if(name == "Ranged"){
            dataSet = {
                'action': 'player_level_up_ranged',
                'player': player
            }
        }
        if(name == "Forging"){
            dataSet = {
                'action': 'player_level_up_forging',
                'player': player
            }
        }
        $.ajax({ type: 'post', url: '/ajax', data: dataSet, dataType: 'json' })
            .done( (data) => {
                console.log( data )
                if ( data.result == 'OK' )
                {
                    flash( e.currentTarget, "20, 255, 20" )
                } else {
                    flash( e.currentTarget, "255, 20, 20")
                }
            })
    })

    $("#ServerSelect #ServerSearch").keyup( (e) => {
        let parent = "#ServerSelect"
        let value = $(e.target).val().trim().toLowerCase()
        let itemsGroup = $(parent + " #SelectServerList .list-group-item")
        itemsGroup.toggleClass("active", false)
        if ( value == '' )
        {
            itemsGroup.show()
        } else {
            itemsGroup.each((i, elem) => {
                let hasMatch = 
                ( 
                  $(elem).attr('id').toLowerCase().indexOf( value ) > -1
                  || $(elem).text().toLowerCase().indexOf( value ) > -1
                )
                if ( hasMatch )
                    $(elem).show()
                else
                    $(elem).hide()  
            })
        }
    })

    $("a#SelectServerSort").click(( e ) => {
        let parent = "#ServerSelect"
        let itemtype = $(e.target).data('itemtype')
        let serversList = parent + " #SelectServerList"
        let serversListItems = $(serversList + " .list-group-item")
        let sortDirection = $(serversList).data('sortdirection')
        let sortPlayerIcon = $(parent + " #SortPlayerIcon")
        let sortServerIcon = $(parent + " #SortServerIcon")
        if ( sortDirection == "asc" ) {
            sortDirection = "desc"
            sortIcon = "fa-sort-up"
        } else {
            sortDirection = "asc"
            sortIcon = "fa-sort-down"
        }
        $(serversList).data('sortdirection',sortDirection )
        function sort_servers( a, b ) {
            switch( sortDirection ) {
                default:
                case "asc":
                    return ( $(b).attr('name').toLowerCase() < $(a).attr('name').toLowerCase() ) ? 1 : -1
                break;
                case "desc":
                    return ( $(b).attr('name').toLowerCase() >= $(a).attr('name').toLowerCase() ) ? 1 : -1
                break;
            }
        }
        function sort_players( a, b ) {
            if ( sortDirection == "asc" )
                return ( $(b).data('playercount') < $(a).data('playercount') ) ? 1 : -1
            else {
                return ( $(b).data('playercount') >= $(a).data('playercount') ) ? 1 : -1
            }
        }
        sortPlayerIcon.removeClass('fa-sort').removeClass('fa-sort-up').removeClass('fa-sort-down')
        sortServerIcon.removeClass('fa-sort').removeClass('fa-sort-up').removeClass('fa-sort-down')

        switch( itemtype ) {
            case "servers":
                console.log( "sort servers" )                
                serversListItems.sort( sort_servers ).appendTo( serversList )
                sortServerIcon.toggleClass('fa-sort-up', ( sortIcon == 'fa-sort-up' ))
                sortServerIcon.toggleClass('fa-sort-down', ( sortIcon == 'fa-sort-down' ))
                sortPlayerIcon.addClass('fa-sort')
            break
            case "players":
                console.log( "sort players" )
                serversListItems.sort( sort_players ).appendTo( serversList )
                sortPlayerIcon.toggleClass('fa-sort-up', ( sortIcon == 'fa-sort-up' ))
                sortPlayerIcon.toggleClass('fa-sort-down', ( sortIcon == 'fa-sort-down' ))
                sortServerIcon.addClass('fa-sort')
            break
        }

        
    })

    $("#ConnectToServer").click( (e) => {
        addSpinner( e )
    })

    $("#LoginButton").click( (e) => {
        addSpinner( e )
    })

    var ctInput = $("#CommandTerminalInput")
    var ctHistory = {
        currentKey : 0,
        history : [],
        put : ( val ) => {
            ctHistory.history.push( val )
            ctHistory.currentKey = ctHistory.history.length
        },
        getPrev : () => {
            ctHistory.currentKey--
            if ( ctHistory.currentKey < 0 ) 
                ctHistory.currentKey = 0
            if ( !!ctHistory.history[ctHistory.currentKey] )
            {
                return ctHistory.history[ctHistory.currentKey]
            } else {
                return undefined
            }
        },
        getNext : () => {
            ctHistory.currentKey++
            if ( !!ctHistory.history[ctHistory.currentKey])
            {
                return ctHistory.history[ctHistory.currentKey]
            } else {
                return undefined
            }
        }
    }

    // Console Interface
    $("#CommandTerminalSubmit").click( (e) => {
        let command = $("#CommandTerminalInput").val()
        if ( !!command ) 
        {
            ctHistory.put( command )
            ctInput.val("")
            // Send the command
            wsSendJSON({ 
                'action': 'send_command',
                'command': command
            })
        }
    })

    $("#CommandTerminalInput").on("keydown", ( e ) => {
        console.log( "CommandTerminalInput: keyDown event: ", e)
        console.log( ctHistory.currentKey, ctHistory.history )
        switch( e.key )
        {
            case "Enter":
                console.log("Enter was pressed within CommandTerminalInput")
                $("#CommandTerminalSubmit").click()
            break;

            case "Up":
            case "ArrowUp":
                console.log( "ArrowUp" )
                let prevVal = ctHistory.getPrev()
                if ( !!prevVal )
                    ctInput.val( prevVal )
            break;

            case "Down":
            case "ArrowDown":
                let nextVal = ctHistory.getNext()
                if ( !!nextVal )
                {
                    ctInput.val(nextVal)
                } else {
                    ctInput.val('')
                }
            break;
        }
    })

    $("#CTSubsDropdown .dropdown-item").on('click', ( e ) => {
        let subscriptionName = $(e.currentTarget).attr('name')
        console.log("Dropdown event: ", subscriptionName)
        if ( $(e.currentTarget).hasClass("active") )
        {
            $(e.currentTarget).removeClass('active')
            wsSendJSON({'action':'unsubscribe', 'subscription': subscriptionName })
        } else {
            $(e.currentTarget).addClass('active')
            wsSendJSON({'action':'subscribe', 'subscription': subscriptionName })
        }
    })

    // Add some default websockets handlers
    var CommandTerminalLogParity = true
    var ctLog = $("#CommandTerminalLog")
    wsAddHandler( 'Subscription', ( message ) => {
        console.log( message )
        let parity = ( CommandTerminalLogParity ) ? "even" : "odd"
        CommandTerminalLogParity = !CommandTerminalLogParity
        let timestamp = (new Date(message.timeStamp)).toLocaleTimeString('en-US')
        let logMessage = `[${timestamp}] ${message.eventType} | `
        switch( message.eventType )
        {
            case "InfoLog":
                logMessage += message.data.message
            break
            case "PlayerJoined":
                logMessage += "Player joined: "+ message.data.user.username
            break
            case "PlayerLeft":
                logMessage += "Player left: "+ message.data.user.username
            break;
            case "PlayerStateChanged":
                let enterexit = ( message.data.isEnter ) ? "entered" : "left"
                logMessage += `${message.data.user.username} ${enterexit} state ${message.data.state}`
            break;
            default:
                if ( !!message.data )
                    logMessage += '<pre>'+ JSON.stringify( message.data, null, 4 ) +'</pre>'
            break;
        }
        // Check scroll position
        console.log( ctLog[0].scrollHeight, ctLog[0].scrollTop, ctLog[0].clientHeight )
        let scrolled = ctLog[0].scrollHeight - ctLog[0].scrollTop === ctLog[0].clientHeight
        console.log( "scrolled? ", scrolled )
        ctLog.append(
            `<div class='list-group-item ${parity}'><p>${logMessage}</p></div>`
        )
        if ( scrolled )
        {
            ctLog.stop().animate({
                scrollTop: ctLog[0].scrollHeight
            }, 800 )
        }
    })

    wsAddHandler( 'CommandResult', ( message ) => {
        console.log( message )
        let parity = ( CommandTerminalLogParity ) ? "even" : "odd"
        CommandTerminalLogParity = !CommandTerminalLogParity
        let timestamp = (new Date(message.timeStamp)).toLocaleTimeString('en-US')
        let resultClass = ''

        let logMessage = `[${timestamp}] ${message.type} | `
        if ( !!message.data.Exception )
        {
            resultClass = 'fail'
            logMessage += message.data.Exception.Message
        } else {
            resultClass = 'ok'
            let command = message.data.Command.FullName

            logMessage += `${command}: `
            switch( command )
            {
                case "help.":
                case "select.tostring":
                    logMessage += `<pre>${message.data.ResultString}</pre>`
                break;

                default:
                    if ( !!message.data.Result)
                    {
                        logMessage += "<pre>"+ JSON.stringify( message.data.Result, null, 4 ) +"</pre>"
                    } else {
                        logMessage += message.data.ResultString
                    }
                break;
            }
        }
        ctLog.append(
            `<div class='list-group-item ${parity} ${resultClass}'><p>${logMessage}</p></div>`
        )
        ctLog.stop().animate({
            scrollTop: ctLog[0].scrollHeight - ctLog[0].clientHeight
        }, 800 )
    })

    wsAddHandler('player_set_home', ( message ) => {
        let parent = selectedConfigForm
        console.log( message )
        let color = ( message.result == 'OK' ) ? "20, 255, 20" : "255, 20, 20"
        flash( $(parent +" #PlayerSetHomeButton"), color )
    })

})

function addSpinner( e )
{
    $(e.target).html('<i class="fa fa-spinner fa-spin" />')
}

function delSpinner( e, ihtml )
{
    $(e.target).html(ihtml)
}

let sprActive = false
let sprCurrentHtml = ''
function spinnerReplace( elem )
{
    if ( !sprActive )
    {
        sprCurrentHtml = $("#"+elem).html()
        $("#"+elem).html( '<i class="fa fa-spinner fa-spin" />')
        $("#"+elem).addClass('disabled')
        sprActive = true
    }
}

function spinnerRevert( elem )
{
    $("#"+elem).html( sprCurrentHtml )
    $("#"+elem).removeClass('disabled')
    sprActive = false
}

function flash( elem, color ){
    let opacity = 100;
    var interval = setInterval(()=>{
        opacity -= 5;
        if ( opacity <= 0) clearInterval( interval )
        $(elem).css({background: "rgba("+ color +", "+ opacity/100 +")"})
    }, 30)
    $(elem).css({opacity:0})
    $(elem).animate({opacity: 1}, 700)
}
function highlight( elem, color ){
    $(elem).css({background: "rgba("+color+")"})
}
function unhighlight( elem, color ){
    flash( elem, color )
}

var buttonHandler = ( message ) => {
    console.log( "handler: ", message )
    if ( message.result != 'OK' )
    {
        flash( $("#"+message.data.element ), "255, 20, 20")
    }
}

function updateServer( data )
{
    console.log( data )
    if ( data.err !== undefined )
    {
        $("#ServerName").html( data.err )
    }
}

async function loadPlayerConfig( userId, parentElem )
{
    $.ajax({
        type: 'post',
        url: '/ajax',
        data: { 'action': 'get_player_config', 'player' : userId },
        dataType: 'json'
    })
    .done( (data) => {
        if ( !!data.data.Result )
        {
            let conf = data.data.Result
            console.log( conf )

            $(parentElem +" input.SetPlayerConfig").each( (i, elem) => {
                let name = elem.name
                let config = conf.find(obj => { return obj.Name === name })
                console.log(elem)
                console.log(config)
                if ( config !== undefined )
                {
                    $(elem).attr('min', config.Min)
                    $(elem).attr('max', config.Max)
                    $(elem).val( Number(config.Value).toFixed(3) )
                    $(elem).attr('step', '1' )

                    switch( name )
                    {
                        case 'health':
                            $(elem).attr('step', '0.5')
                            $(elem).attr('min', '0.1')
                            $(elem).attr('max', conf.find( x=>{ return x.Name == "maxhealth" }).Max )
                        break

                        case 'maxhealth':
                        case 'speed':
                        case 'xpboost':
                            $(elem).attr('step', '0.5')
                        break

                        case 'fullness':
                            $(elem).attr('step', '1')
                            $(elem).attr('min', '0')
                            $(elem).attr('max', '5')
                        break

                        case 'hunger':
                        case 'cripplehealth':
                        case 'nightmare':
                            $(elem).attr('step', '0.1')
                        break
                    }
                } else {
                    console.log( "config for "+ name +" is undefined")
                }
            })
        }
        return (!!data.data.Result)
    })
}

function loadPlayersOnline( callBack )
{
    console.log( "loadPlayersOnline" )
    $.ajax({
        type: 'post',
        url: '/ajax',
        data: { 'action': 'get_player_list' },
        dataType: 'json'
    })
    .done( (data) => {
        if ( data.result == 'OK' && !!data.data.Result )
        {
            console.log( data )
            return callBack( data.data.Result );
        } else {
            console.log( "Error retrieving player list" )
            return null
        }
    })
}