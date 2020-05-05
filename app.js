const express = require('express');
const app = express();
const router = express.Router();
const axios = require('axios').default;
const momentjs = require('moment');

const path = __dirname + '/views/';
const port = 8000;

router.use(function (req,res,next) {
  next();
});

/**
 AC: Script that calculates how many times each visitor has visited the office.
 Note: Please, let me know if needs to organize files into regular Node app folders, add tests, etc.
 */

router.get('/visits', function(req, res) {

  const apiPath = 'https://motorway-challenge-api.herokuapp.com/api';

  const getDataByUrl = (urls) => Promise.all(urls.map(fetchData));
  
  const fetchData = (url) => {
    return axios
      .get(url)
      .then(response => response.data)
      .catch(error => { success: false });
  }

  async function getToken() {
    const response = await axios.get(`${apiPath}/login`);
    const { token } = response.data;
    return token;
  }

  async function getVisitsTotal(token) {
    const response = await axios.get(`${apiPath}/visits?&token=${token}`);
    const { total } = response.data;
    return total;
  }

  const getAmountOfPages = total => Math.ceil(Number(total)/15);

  const getReqUrlsList = (total, token) => {
    let amountOfReqs = getAmountOfPages(total);
    const arrayOfPages = [...Array(amountOfReqs).keys()];
    return arrayOfPages.map(item => `${apiPath}/visits?page=${item+1}&token=${token}`);
  }

  async function getVisitsData() {
    const token = await getToken();
    const visitsAmount = await getVisitsTotal(token);
    const urls = getReqUrlsList(visitsAmount, token);
    const response = await getDataByUrl(urls);
    return response;
  }

  const combinePagesData = (data) => data.map(item => item.data);
  const flatCombinedData = (data) => [].concat.apply([], data);
  const daysOfWeekToExecute = () => [6,7,momentjs().day()];
  const getFilteredVisitsByExecutedDays = (data) => data.filter(item => !daysOfWeekToExecute().includes(momentjs(item.date).isoWeekday()));
  const getBusinessDaysVisitorsNames = (visitors) => visitors.map(a => a.name);
  const sortVisitsByVisitorsNames = (visitors) => visitors.map(item => item.split('#')).sort((a, b) => a[1]-b[1]).map(item=>item.join('#'));
  const getVisitsAmoutByVisitorsNames = (names) => names.reduce((acc, el) => {
    acc[el] = (acc[el] || 0) + 1;
    return acc;
  }, {});

  const getBusinessDaysVisitsList = (data) => {
    const combinedData = combinePagesData(data);
    const dataNewFlat = flatCombinedData(combinedData);
    const filteredVisitsByExecutedDays = getFilteredVisitsByExecutedDays(dataNewFlat);
    const businessDaysVisitorsNames = getBusinessDaysVisitorsNames(filteredVisitsByExecutedDays);
    const sortedVisitsByVisitorName = sortVisitsByVisitorsNames(businessDaysVisitorsNames);
    const visitsAmoutByVisitorsNames = getVisitsAmoutByVisitorsNames(sortedVisitsByVisitorName);
    return visitsAmoutByVisitorsNames;
  };

  getVisitsData()
  .then(data => res.send({ visits: getBusinessDaysVisitsList(data) }))
  .catch(e => res.send({ error: `${e}` }));
});

app.use(express.static(path));
app.use('/', router);

app.listen(port, function () {
  console.log(`Visitors app is listening on port ${port}!`)
});