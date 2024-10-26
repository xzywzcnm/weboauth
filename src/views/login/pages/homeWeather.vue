<template>
  <!-- @mouseleave="leaveTabsBox"
  @mouseenter="mouseoverTabsBox" -->
  <div
    class="weather-container"
    v-loading="pageLoading"
    v-if="countryList.length > 0"
  >
    <!-- @tab-click="handleClick" -->
    <el-tabs
      v-model="activeName"
      type="border-card"
      :stretch="true"
      class="weather-tabs"
      @tab-click="handleClick"
      v-click-outside="clickTabOutside"
    >
      <el-tab-pane
        v-for="(item, index) in countryList"
        :key="index"
        :name="item.cityId"
      >
        <template v-slot:label>
          <!-- @mouseenter="checkTab(item)" -->
          <div>
            <div>{{`${item.country} - ${item.cityName}`}}</div>
            <div class="tabs-weather-info">
              <div class="weather-info-item">
                <svg-icon class="weather" :name="`weather-${typeof item.cityWeatherInfo !== 'undefined' ? item.cityWeatherInfo.icon : ''}`" />
              </div>
              <div class="weather-info-item temperature">
                {{item.cityWeatherInfo ? `${typeof item.cityWeatherInfo.temp !== 'undefined' ? `${item.cityWeatherInfo.temp}℃` : ''}` : ''}}
              </div>
              <div class="weather-info-item climate">
                {{item.cityWeatherInfo ? item.cityWeatherInfo.conditions : ''}}
              </div>
              <div class="weather-info-item temperature-range">
                <p>{{item.cityWeatherInfo ? `${typeof item.cityWeatherInfo.mint !== 'undefined' ? `${item.cityWeatherInfo.mint}℃` : ''}` : ''}}</p>
                <p>{{item.cityWeatherInfo ? `${typeof item.cityWeatherInfo.maxt !== 'undefined' ? `${item.cityWeatherInfo.maxt}℃` : ''}` : ''}}</p>
              </div>
            </div>
          </div>
        </template>
        <div class="weather-tabs-mask">
          <div
            class="weather-tabs-box"
            v-loading="(loadingCityWeather[item.cityId] || false)"
            element-loading-background="rgba(255, 255, 255, 0.7)"
          >
            <el-table
              :data="cityWeatherData[item.cityId]"
              max-height="55vh"
              style="width: 100%"
            >
              <el-table-column
                v-for="(col, index) in tabelColumn"
                :prop="col.prop"
                :label="col.label"
                :key="`table-${index}`"
                :fixed="index === 0 ? 'left' : false"
                :min-width="index === 0 ? 200 : 105"
              >
                <template v-slot:header>
                  <div class="td-city-header" :class="{'td-city-header-first': index === 0}">
                    <p>{{col.label}}</p>
                    <p>{{col.prop}}</p>
                  </div>
                </template>
                <template v-slot="{row}">
                  <div v-if="index === 0" class="td-city-weather-row">
                    <p class="td-city-name">{{row[col.prop] ? row[col.prop].cityName : row.cityName || ''}}</p>
                    <div v-if="row[col.prop]" class="td-city-weather">
                      <div class="td-city-icon">
                        <svg-icon class="weather" :name="`weather-${row[col.prop].icon}`" />
                      </div>
                      <div>
                        <p>
                          <span class="td-city-temp">{{typeof row[col.prop].temp ? `${row[col.prop].temp}℃` : ''}}</span>
                          <span class="td-city-conditions">{{row[col.prop].conditions || ''}}</span>
                        </p>
                        <p class="td-city-range" v-if="(typeof row[col.prop].mint !== 'undefined' || typeof row[col.prop].maxt !== 'undefined')">
                          {{`${typeof row[col.prop].mint !== 'undefined' ? row[col.prop].mint : ''}
                           ~ ${typeof row[col.prop].maxt !== 'undefined' ? row[col.prop].maxt : ''}℃`}}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div v-else-if="row[col.prop]" class="td-city-future-weather td-city-weather-row">
                    <p class="td-city-future-icon">
                      <svg-icon class="weather" :name="`weather-${row[col.prop].icon}`" />
                    </p>
                    <p class="td-city-future-range">
                      {{row[col.prop].mint}} ~ {{row[col.prop].maxt}}℃
                    </p>
                    <p class="td-city-future-conditions">
                      {{row[col.prop].conditions || ''}}
                    </p>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>
<script lang="tsx">
import { defineComponent } from 'vue';
import type { TabsPaneContext } from 'element-plus';
import weatherType from '../weatherType';

interface dataType{
  countryList: Array<{[key:string]: any}>,
  cityWeatherData: {[key:string]: Array<{[key:string]: any}>},
  loadingCityWeather: {[key:string]: boolean},
  tabelColumn: Array<{[key:string]: any}>,
  [key:string]: any
}

export default defineComponent({
  name: 'homeWeather',
  data():dataType {
    return {
      activeName: '',
      pageLoading: false,
      loadingCityWeather: {},
      cityWeatherData: {},
      countryJson: {},
      countryList: [],
      tabelColumn: [],
      isHiddenTime: null,
      leaveTabsTime: null,
      weatherType: weatherType,
      isHiddenWeather: false
    };
  },
  created() {
    this.initData();
  },
  mounted() {},
  // 组件销毁前
  beforeUnmount () {},
  methods: {
    initData () {
      this.pageLoading = true;
      const allPromise = [
        { getVal: () => this.getFirstWeather(), key: 'countryList' }
      ];
      this.$common.allSettled(allPromise.map(m => m.getVal)).then(arr => {
        arr.forEach((item, index) => {
          if (item.status === 'fulfilled') {
            this[allPromise[index].key] = item.value;
          }
        });
        this.countryList.forEach(item => {
          this.loadingCityWeather[item.cityId] = false;
          this.cityWeatherData[item.cityId] = [];
          this.countryJson[item.cityId] = item;
        });
        this.pageLoading = false;
      })
    },
    // 获取已设置的城市天气
    getCountryCity (country:string):Promise<Array<{[key:string]: any}>> {
      return new Promise((resolve) => {
        if (this.$common.isEmpty(country)) return resolve([]);
        this.$http.get(this.api.weatherApi.getCountryAllCityWeather, { params: {country: country}, hiddenError: true }).then(res => {
          resolve((res.data || []));
        }).catch(() => {
          resolve([]);
        })
      });
    },
    // 获取已添加的国家排在第一的城市的天气
    getFirstWeather () {
      return new Promise((resolve) => {
        let cityWeatherInfo = {};
        let iconSplit:Array<any> = [];
          let icon = '';
        this.$http.get(this.api.weatherApi.getFirstWeather, { hiddenError: true }).then(res => {
          const weather = (res.data || []).map((m: {[i:string]: any}) => {
            if (!this.$common.isEmpty(m.weatherCityWeatherInfoDTOList) && !this.$common.isEmpty(m.weatherCityWeatherInfoDTOList[0])) {
              icon = m.weatherCityWeatherInfoDTOList[0].icon;
              if (!this.$common.isEmpty(icon)) {
                iconSplit =  icon.includes(',') && weatherType[icon] ? [icon] : icon.split(',');
              }
              cityWeatherInfo = {
                ...m.weatherCityWeatherInfoDTOList[0],
                icon: iconSplit.length > 0 ? (weatherType[iconSplit[0]] || icon) : icon
              }
            }
            return {
              ...m,
              cityWeatherInfo: cityWeatherInfo
            }
          });
          resolve(weather);
        }).catch(() => {
          resolve([]);
        })
      });
    },
    // 获取天气列表表头
    getWeatherColumn (res: Array<{[key:string]: any}>) {
      const getHeader = res.filter(f => !this.$common.isEmpty(f.weatherCityWeatherInfoDTOList)).map(m => m.weatherCityWeatherInfoDTOList);
      if (!this.$common.isEmpty(getHeader)) return getHeader[0].map((item:{[i:string]:any}) => {
        return{ label: item.week, prop: item.datetimestr };
      });
      // 当接口没有返回表头时
      const nowDay = new Date();
      const week = { 0: '周日', 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六' };
      let newCol:Array<{[key:string]: any}> = [];
      let day:any = null;
      let index:number = 0;
      for (index = 0; index <= 15; index++) {
        day = this.$common.dayjs(nowDay).add(index, 'day');
        newCol.push({ label: index === 0 ? '今天' : week[day.day()], prop: day.format('MM/DD') });
      }
      return newCol;
    },
    // 鼠标悬浮时触发
    checkTab (tab:{[key:string]:any}) {
      this.$nextTick(() => {
        this.showTabHand(tab.cityId);
        this.activeName = tab.cityId;
      })
    },
    // tabs 切换
    handleClick (tab: TabsPaneContext, event?: Event) {
      const presentTab = tab.paneName as string;
      this.showTabHand(presentTab);
    },
    showTabHand (tab:string) {
      if (tab === this.activeName) {
        this.activeName = '';
        return;
      }
      this.loadingCityWeather[tab] = true;
      let iconSplit = [];
      setTimeout(() => {
        this.getCountryCity(this.countryJson[tab].country as string).then(res => {
          this.tabelColumn = this.getWeatherColumn(res);
          let tableData:Array<{[key:string]: any}> = [];
          (res || []).forEach(item => {
            if (!this.$common.isEmpty(item.weatherCityWeatherInfoDTOList)) {
              let rowObj:{[i:string]:any} = {};
              item.weatherCityWeatherInfoDTOList.forEach((row:{[i:string]:any}) => {
                if (!this.$common.isEmpty(row)) {
                  iconSplit = row.icon.includes(',') && weatherType[row.icon] ? [row.icon] : row.icon.split(',');
                  row.icon = iconSplit.length > 0 ? (weatherType[iconSplit[0]] || row.icon) : row.icon;
                  rowObj[row.datetimestr] = {country: item.country, cityName: item.cityName, ...row};
                }
              });
              this.tabelColumn.forEach(col => {
                if (this.$common.isEmpty(rowObj[col.prop])) {
                  rowObj[col.prop] = {country: item.country, cityName: item.cityName};
                }
              });
              tableData.push(rowObj);
            } else {
              tableData.push({country: item.country, cityName: item.cityName});
            }
          });
          // console.log('列：', this.tabelColumn);
          // console.log('数据：', tableData);
          this.$nextTick(() => {
            this.cityWeatherData[tab] = tableData;
          });
          this.loadingCityWeather[tab] = false;
        })
      }, 300);
    },
    mouseoverTabsBox () {
      this.isHiddenWeather = true;
      clearTimeout(this.isHiddenTime);
      this.isHiddenTime = setTimeout(() => {
        this.isHiddenWeather = false;
      }, 200);
    },
    // 鼠标离开天气
    leaveTabsBox () {
      clearTimeout(this.leaveTabsTime);
      this.leaveTabsTime = setTimeout(() => {
        if (!this.isHiddenWeather) {
          this.activeName = '';
        }
      }, 220)
    },
    // 点击组件之外位置
    clickTabOutside () {
      this.activeName = '';
    }
  }
});
</script>
<style lang="scss" scoped>
  .weather-container{
    margin: 20px 30px 0 30px;
    min-height: 50px;
    :deep(.el-tabs__content){
      position: relative;
      padding: 0;
      overflow: initial;
    }
    .weather-tabs{
      background: none;
      border: none;
      .tabs-weather-info{
        display: flex;
        height: 45px;
        align-items: center;
        vertical-align: top;
        .weather-info-item{
          flex: 10;
          padding: 0 5px;
          &:first-child{
            padding: 0 5px 0 0;
          }
          &:last-child{
            padding: 0 0 0 5px;
          }
          &.temperature{
            font-size: 25px;
          }
          &.climate{
            font-size: 12px;
          }
          &.temperature-range{
            font-size: 12px;
          }
          svg.weather{
            font-size: 35px;
          }
        }
      }
      :deep(.el-tabs__header){
        background: none;
        border: none;
        .el-tabs__nav-wrap.is-scrollable{
          position: relative;
          padding: 0 25px;
        }
        .el-tabs__nav-next, .el-tabs__nav-prev{
          position: absolute;
          display: flex;
          align-items: center;
          top: 50%;
          padding: 0 5px;
          height: 100%;
          color: #fff;
          transform:translate(0, -50%);
          background: rgba(#000, 0.15);
          line-height: normal;
          &.is-disabled{
            cursor: no-drop;
          }
          i {
            font-size: 15px;
          }
        }
        .el-tabs__item{
          position: relative;
          padding: 5px 20px;
          margin-left: 10px;
          height: initial;
          line-height: 1.6em;
          background: rgba(#000, 0.15);
          color: #fff;
          border-radius: 5px;
          border-color: rgba($color: #fff, $alpha: 0);
          vertical-align: top;
          &.is-active, &.is-active:hover{
            background: rgba($color: #2175ff, $alpha: 0.9);
            &:before{
              position: absolute;
              content: '';
              top: 0;
              left: 0;
              bottom: 0;
              right: 0;
              border-radius: 5px;
              background: rgba($color: #fff, $alpha: 0.2);
            }
          }
          &:hover {
            background: rgba($color: #2f66ff, $alpha: 0.9);
            &:before{
              position: absolute;
              content: '';
              top: 0;
              left: 0;
              bottom: 0;
              right: 0;
              border-radius: 5px;
              background: rgba($color: #fff, $alpha: 0.2);
            }
          }
          &:first-child{
            margin-left: 0;
          }
        }
        .el-tabs__nav-scroll{
          width: calc(100% - 10px);
          margin-left: 5px;
          .el-tabs__nav.is-stretch{
            display: inline-block;
          }
        }
      }
    }
    .weather-tabs-mask{
      position: absolute;
      width: 100%;
      top: -1px;
      left: 0;
      border-radius: 20px;
      .weather-tabs-box{
        position: relative;
        margin: 10px 0 20px 0;
        width: 100%;
        min-height: 100px;
        padding: 0;
        color: #fff;
        background: rgba($color: #2175ff, $alpha: 0.9);
        border-radius: 20px;
        overflow: hidden;
        &:before{
          content: '';
          position: absolute;
          width: 100%;
          bottom: 0;
          top: 0;
          background: rgba($color: #fff, $alpha: 0.2);
          border-radius: 20px;
        }
      }
      :deep(.el-table){
        background: none;
        .el-table__inner-wrapper{
          &:before{
            background: none;
          }
        }
        tr {
          color: #fff;
          background: none;
        }
        .el-table__body-wrapper tr td.el-table-fixed-column--left{
          background: #5897ff;
          &:first-child{
            border-radius: 10px 0 0 0;
          }
        }
        .el-table__body tr.hover-row>td.el-table__cell{
          background: none;
          &.el-table-fixed-column--left{
            background: #5897ff;
            &:first-child{
              border-radius: 10px 0 0 0;
            }
          }
        }
        td.el-table__cell, th.el-table__cell.is-leaf{
          border-bottom: 1px solid rgba($color: #ebeef5, $alpha: 0.15);
        }
        th{
          &.el-table__cell{
            background: none;
            &.el-table-fixed-column--left{
              background: #5897ff;
              &:first-child{
                border-radius: 10px 0 0 0;
              }
            }
          }
        }
      }
      .td-city-header{
        text-align: center;
        font-size: 13px;
        font-weight: 400;
        &.td-city-header-first{
          font-size: 15px;
        }
      }
      .td-city-name{
        font-size: 20px;
      }
      .td-city-weather{
        display: flex;
        align-items: center;
        .td-city-icon{
          padding-right: 5px;
          svg.weather{
            font-size: 40px;
          }
        }
        .td-city-temp{
          padding-right: 5px;
          font-size: 25px;
        }
        .td-city-conditions{
          font-size: 12px;
        }
      }
      .td-city-weather-row{
        padding: 10px 0;
      }
      .td-city-future-weather{
        text-align: center;
        .td-city-future-icon{
          svg.weather{
            font-size: 30px;
          }
        }
        .td-city-future-range{
          font-size: 14px;
        }
        .td-city-future-conditions{
          font-size: 14px;
        }
      }
    }
  }
</style>