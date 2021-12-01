vcl 4.1;

backend default {
  .host = "dash-server:5000";
}

sub vcl_recv {
  if( req.url == "/stat" ) {
    return( pass );
  }

  if( req.url ~ "/dash/.+\.mpd" ) {
    return( pass );
  }
}