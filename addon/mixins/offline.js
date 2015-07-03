import Ember from 'ember';
import baseMixin from 'ember-data-offline/mixins/base';

export default Ember.Mixin.create(baseMixin, {
  //Check if we really need this shouldReload
  shouldReloadAll(store, snapshotRecordArray) {
    return true;
  },

  shouldBackgroundReloadAll: function(store, snapshotRecordArray) {
    return true;
  },
  findAll: function(store, typeClass, sinceToken, snapshots, fromJob) {
    console.log('findAll offline adapter', typeClass, arguments);
    return this._super.apply(this, arguments).then(records => {
        console.log('findAll offline adapter then', typeClass, fromJob);
      if (!fromJob) {
        console.log('findAll offline adapter fromJob', typeClass);
        this.createOnlineJob('findAll', [store, typeClass, sinceToken, snapshots, true], store);
      }
      return records;
    }).catch(console.log.bind(console));
  },

  find: function(store, typeClass, id, snapshot, fromJob) {
    return this._super.apply(this, arguments).then(record => {
      if (!fromJob) {
        this.createOnlineJob('find', [store, typeClass, id, snapshot, true], store);
      }
      if (Ember.isEmpty(record)) {
       return {id: id};
      }
      return record;
    }).catch(console.log.bind(console));
  },

  findQuery: function(store, type, query, fromJob) {
    return this._super.apply(this, arguments).then(record => {
      if (!fromJob) {
        this.createOnlineJob('findQuery', [store, type, query, true], store);
      }
      return record;
    }).catch(console.log.bind(console));
  },

  findMany: function(store, type, ids, snapshots, fromJob) {
    return this._super.apply(this, arguments).then(records => {
      if (!fromJob) {
        this.createOnlineJob('findMany', [store, type, ids, snapshots, true], store);
      }
      let isValidRecords = records.reduce((p, n) => {
        return p && n;
      }, true);
      if (Ember.isEmpty(isValidRecords)) {
        return []; 
      }
      return records;
    }).catch(console.log.bind(console));
  },

  createRecord(store, type, snapshot, fromJob) {
    //think about merge id....very important. maybe unload Record, and push Record...
    if (!fromJob) {
      this.createOnlineJob('createRecord', [store, type, snapshot, true], store);
    }
    return this._super.apply(this, arguments);
  },

  updateRecord(store, type, snapshot, fromJob) {
    if (!fromJob) {
      this.createOnlineJob('updateRecord', [store, type, snapshot, true], store);
    }
    return this._super.apply(this, arguments);
  },

  deleteRecord(store, type, snapshot, fromJob) {
    if (!fromJob) {
      this.createOnlineJob('deleteRecord', [store, type, snapshot, true], store);
    }
    return this._super.apply(this, arguments);
  }
});
