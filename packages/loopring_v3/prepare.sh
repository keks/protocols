npx buidler node --hostname 0.0.0.0 | tee eth-node.out &
sleep 4
npm run migrate-dev && while :
do
    node deposit.js;
    sleep 5;
done
