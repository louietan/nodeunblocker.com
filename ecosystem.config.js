module.exports = {
  apps : [{
    name   : "nodeunblocker",
    script : "./app.js",
    watch  : true,
    node_args : `--max-http-header-size=${1 * 1024 * 1024}`,
    exec_mode : "cluster",
    instances : "max",
    env: {
       NODE_ENV: "production",
       NODE_TLS_REJECT_UNAUTHORIZED: 0,
       PORT: 8080
    }
  }]
}
