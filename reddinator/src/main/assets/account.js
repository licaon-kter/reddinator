// set article from document hash
var username;
var color_vote = "#A5A5A5";
var color_upvote_active = "#FF8B60";
var color_downvote_active = "#9494FF";

function init(themeColors, user){
    username = user;
    setTheme(themeColors);
}

function setTheme(themeColors){
    var themeColors = JSON.parse(themeColors);
    $("body").css("background-color", themeColors["background_color"]);
    $("#loading_view, .reply_expand, .more_box").css("color", themeColors["load_text"]);
    $(".comment_text").css("color", themeColors["headline_text"]);
    $(".comment_user").css("color", themeColors["source_text"]);
    $(".fa-star").css("color", themeColors["votes_icon"]);
    $(".comment_score").css("color", themeColors["votes_text"]);
    $(".fa-comment").css("color", themeColors["comments_icon"]);
    $(".comment_reply_count").css("color", themeColors["comments_text"]);
    $("button").css("background-color", themeColors["header_color"]);
    $("body").show();
}

function populateComments(json){
    var data = JSON.parse(json);
    $("#loading_view").hide();
    $("#base").show();
    var lastItemId = 0;
    for (var i in data){
        lastItemId = data[i].data.name;
        if (data[i].kind=="t1"){
            appendComment(data[i].data, false);
        } else if (data[i].kind=="t3") {
            appendPost(data[i].data, false);
        }
    }
    appendMoreButton(lastItemId);
}

function clearComments(){
    $("#base").html();
}

function showLoadingView(text){
    var loading = $("#loading_view");
    loading.children("h4").text(text);
    $("#base").hide();
    loading.show();
}
// java bind functions
function reloadComments(){
    showLoadingView("Loading...");
    $("#base").html('');
    Reddinator.reloadFeed($("#sort_select").val());
}

function loadMoreComments(moreId){
    Reddinator.loadMore(moreId);
}

function vote(thingId, direction){
    // determine if neutral vote
    if (direction == 1) {
        if ($("#"+thingId+" .comment_upvote").css("color")=="rgb(255, 139, 96)") { // if already upvoted, neutralize.
            direction = 0;
        }
    } else { // downvote
        if ($("#"+thingId+" .comment_downvote").css("color")=="rgb(148, 148, 255)") {
            direction = 0;
        }
    }

    Reddinator.vote(thingId, direction);
}

function voteCallback(thingId, direction){
    var upvote = $("#"+thingId).children(".comment_vote").children(".comment_upvote");
    var downvote = $("#"+thingId).children(".comment_vote").children(".comment_downvote");
    switch(direction){
        case "-1":
            upvote.css("color", color_vote);
            downvote.css("color", color_downvote_active);
            break;
        case "0":
            upvote.css("color", color_vote);
            downvote.css("color", color_vote);
            break;
        case "1":
            upvote.css("color", color_upvote_active);
            downvote.css("color", color_vote);
            break;
    }
    console.log("vote callback received: "+direction);
}

function comment(parentId, text){
    if (text==""){
        alert("Enter some text for the comment.");
        commentCallback(parentId, false);
        return;
    }
    //console.log(parentId+" "+text);
    Reddinator.comment(parentId, text);
}

function commentCallback(parentId, commentData){
    //console.log("comment callback called");
    var postElem;
    if (parentId.indexOf("t3_")!==-1){
        postElem = $("#post_comment_box");
    } else {
        postElem = $("#"+parentId+" > .post_box");
    }
    if (commentData){
        commentData = JSON.parse(commentData);
        postElem.children("textarea").val("");
        if (parentId.indexOf("t3_")!==-1){
            $("#post_comment_button").show();
            // in case of submitting first comment
            $("#loading_view").hide();
            $("#base").show();
        }
        postElem.children('textarea').val('');
        postElem.hide();
        appendComment(parentId, commentData, true)
    }
    postElem.children("button").prop("disabled", false);
}

function deleteComment(thingId){
    var answer = confirm("Are you sure you want to delete this comment?");
    if (answer){
        Reddinator.delete(thingId);
    }
}

function deleteCallback(thingId){
    $("#"+thingId).remove();
}

function startEdit(thingId){
    // skip if current is being edited
    var post_box = $("#"+thingId+" > .comment_text");
    if (!post_box.hasClass("editing")){
        // store html comment text
        post_box.data('comment_html', post_box.html());
        // prepare edit element
        var editElem = $("#edit_template").clone().show();
        editElem.find('textarea').val(post_box.text());
        // remove current html and append edit box
        post_box.html('');
        editElem.children().appendTo(post_box);
        post_box.addClass('editing');
    }
}
function cancelEdit(thingId){
    // skip if not being edited
    var post_box = $("#"+thingId+" > .comment_text");
    if (post_box.hasClass("editing")){
        // remove edit box and restore html content
        post_box.empty().html(post_box.data('comment_html'));
        post_box.removeClass('editing');
    }
}
function edit(thingId, text){
    if (text==""){
        alert("Enter some text for the comment.");
        editCallback(thingId, false);
        return;
    }
    Reddinator.edit(thingId, text);
}
function editCallback(thingId, commentData){
    // skip if not being edited or result false
    var post_box = $("#"+thingId+" > .comment_text");
    if (commentData && post_box.hasClass("editing")){
        commentData = JSON.parse(commentData);
        post_box.empty().html(htmlDecode(commentData.body_html));
        post_box.removeClass('editing');
    } else {
        post_box.children("button, textarea").prop("disabled", false);
    }
}

function populateMoreComments(json){
    //console.log(json)
    $("#more").remove();
    populateComments(json);
}

function noChildrenCallback(moreId){
    $("#more h5").text("There's nothing more here");
}

function resetMoreClickEvent(moreId){
    var moreElem = $("#more");
    moreElem.children("h5").text('Load '+moreElem.data('rlength')+' More');
    moreElem.one('click',
        {lastItemId: moreElem.data('rname')},
        function(event){
            $(this).children("h5").text("Loading...");
            loadChildComments(event.data.lastItemId);
        }
    );
}

function appendMoreButton(lastItemId){
    var moreElem = $("#more_template").clone().show();
    moreElem.attr("id", "more");
    moreElem.children("h5").text("Load more");
    moreElem.data('rname', lastItemId);
    moreElem.one('click',
        {lastItemId: lastItemId},
        function(event){
            $(this).children("h5").text("Loading...");
            loadMoreComments(event.data.lastItemId);
        }
    );
    moreElem.css("margin-right", "0").appendTo("#base");
}

function appendPost(postData, prepend){
    var postElem = $("#post_template").clone().show();
    postElem.appendTo("#base");
}

function appendComment(commentData, prepend){
    //console.log(JSON.stringify(commentData));
    var commentElem = $("#comment_template").clone().show();
    commentElem.attr("id", commentData.name);
    var text = htmlDecode(commentData.body_html.replace(/\n\n/g, "\n").replace("\n&lt;/div&gt;", "&lt;/div&gt;")); // clean up extra line breaks
    commentElem.find(".comment_text").html(text);
    commentElem.find(".comment_user").text('/u/'+commentData.author).attr('href', 'https://www.reddit.com/u/'+commentData.author);
    commentElem.find(".comment_score").text(commentData.score_hidden?'hidden':commentData.score);
    commentElem.find(".comment_reply_count").text("0");
    // check if likes
    if (commentData.hasOwnProperty('likes')){
        if (commentData.likes==1){
            commentElem.find(".comment_upvote").css("color", color_upvote_active);
        } else if (commentData.likes==-1) {
            commentElem.find(".comment_downvote").css("color", color_downvote_active);
        }
    }
    // check if author
    if (commentData.author==username)
        commentElem.find(".user_option").show();
    var flag = commentElem.find(".distinguish_flag");
    if (commentData.link_author==username){
        flag.text("[S]");
        flag.css("visibility", "visible");
    }
    if (commentData.distinguished!=null){
        switch(commentData.distinguished){
            case "moderator":
                flag.text("[M]");
                flag.css("color", "#30925E");
                break;
            case "admin":
                flag.text("[A]");
                flag.css("color", "#F82330");
                break;
            case "special":
                flag.text("[Δ]");
                flag.css("color", "#C22344");
                break;
        }
        flag.css("visibility", "visible");
    }
    if (prepend){
        commentElem.prependTo("#base");
    } else {
        commentElem.appendTo("#base");
    }
}

function htmlDecode(input){
    var e = document.createElement('div');
    e.innerHTML = input;
    return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
}

$(function(){
    // Layout testing code
    //$("#comment_template").clone().show().attr("id", 'test').appendTo("#base");
    //$("#comment_template").clone().show().attr("id", 'test1').appendTo("#test .comment_replies");
    $(document).on('click', ".comment_upvote", function(){
        vote($(this).parent().parent().attr("id"), 1);
    });
    $(document).on('click', ".comment_downvote", function(){
        vote($(this).parent().parent().attr("id"), -1);
    });
    $(document).on('click', ".post_toggle", function(){
        var elem = $(this).parent().parent().parent().children(".post_reply");
        if (elem.is(":visible")){
            elem.hide();
        } else {
            $('.post_reply').hide();
            elem.show();
        }
    });
});