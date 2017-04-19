/**
 * @OnlyCurrentDoc
 *
 * The above comment directs Apps Script to limit the scope of file
 * access for this add-on. It specifies that this add-on will only
 * attempt to read or modify the files in which the add-on is used,
 * and not all of the user's files. The authorization request message
 * presented to users will reflect this limited scope.
 */
/**
 * Creates a menu entry in the Google Docs UI when the document is opened.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 *
 * @param {object} e The event parameter for a simple onOpen trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode.
 */
function onOpen(e){
 SpreadsheetApp.getUi().createAddonMenu().addItem('Take Attendance', 'showSidebar').addItem('Format Sheet', 'formatSheet').addToUi();

}

/**
 * Runs when the add-on is installed.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 *
 * @param {object} e The event parameter for a simple onInstall trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode. (In practice, onInstall triggers always
 *     run in AuthMode.FULL, but onOpen triggers may be AuthMode.LIMITED or
 *     AuthMode.NONE.)
 */
function onInstall(e) {
  onOpen(e);
}



/**
 * Formats the active sheet to have a Name and ID column with no
 * event columns. Also, freezes the first row so that the Name, Event,
 * and ID columns are always visible.
 */
function formatSheet()
{
  var sheet = SpreadsheetApp.getActiveSheet();
  if(!sheet.getDataRange().isBlank())
  {
    var ui = SpreadsheetApp.getUi(); // Same variations.
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if(sheet.getRange(1, 1).getValue().toString() == "Names" &&
      sheet.getRange(1,lastCol).getValue().toString() == "IDS" &&
      lastRow > 1 && lastCol > 2)
    {
      var result = ui.alert(
         'Your sheet is already formatted and may contain Names and IDs.',
         'Would you like to erase all events and preserve the names and IDs?',
          ui.ButtonSet.YES_NO_CANCEL);
      if (result == ui.Button.YES)
      {
        sheet.deleteColumns(2, lastCol - 2);
        return;
      }
      else if (result == ui.Button.CANCEL ||
        result == ui.Button.CLOSE)
        {
        return;
        }
    }

    var result = ui.alert(
       'Your Sheet is not blank, formatting will erase all data.',
       'Are you sure you want to continue?',
        ui.ButtonSet.YES_NO);

    // Process the user's response.
    if (result != ui.Button.YES) {
      // User clicked "No" or X in the title bar.
      // Do nothing
      return;
    }
  }
  sheet.clear();
  sheet.getRange(1,1).setValue("Names");
  sheet.getRange(1,2).setValue("IDS");
  sheet.setFrozenRows(1);
}

/**
 * Opens a sidebar in the document containing the add-on's user interface.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 */
function showSidebar() {
  var ui = HtmlService.createHtmlOutputFromFile('GUI')
      .setTitle('Attendance');
  SpreadsheetApp.getUi().showSidebar(ui);
}


/**
 * Returns the column number of a given eventName.
 */
function getEventColumn(eventName) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var eventRange = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues();
  for(var i = 0; i < eventRange[0].length; i ++)
  {
    if(eventName.toString() == eventRange[0][i].toString())
    {
        return i + 1;
    }
  };
  return -1;
}


/**
 * Marks the the row whose ID corresponds to id present for the Event
 * eventName
 */
function present(id, eventName) {

        var sheet = SpreadsheetApp.getActiveSheet();
        var lastCol = sheet.getLastColumn();
        var lastRow = sheet.getLastRow();
        var idRange = sheet.getRange(2, lastCol, lastRow -1);
        var idObjects = idRange.getValues();
        var returnVal = {};
        returnVal['total'] = lastRow - 1;
        var eventCol = getEventColumn(eventName);
        for (var i = 0; i < idObjects.length; i++)
        {
          if(id.toString() == idObjects[i][0].toString())
          {
            var temp = 0;
            if (sheet.getRange(i+2, eventCol).getValue().toString() != '0' && typeof countAttendees.count != 'undefined')
            {
              temp = countAttendees.count;
            }
            else{

              sheet.getRange(i+2, eventCol).setValue(1);
              temp = countAttendees(eventCol);
            }
            returnVal['present'] = temp;
            Logger.log(returnVal['present']);
            returnVal['name'] = sheet.getRange(i+2, 1).getValue().toString();
            return returnVal;
          }
        }
        throw new Error(id);
}


/**
 * Given the Name and ID of a new person, insert the Name alphabetically
 * into the list of preexisting names, set the Attendance for all events to
 * zero, then mark the id present for the given Event
 */
function addName(name, id, eventName)
{
  Logger.log("addName");
  function formatRow(row, name, id)
  {
    sheet.getRange(row, 1).setValue(name.toString());
    sheet.getRange(row, 2, 1, sheet.getLastColumn() - 1).setValue(0);
    sheet.getRange(row, sheet.getLastColumn()).setValue(id.toString());
  }
  var sheet = SpreadsheetApp.getActiveSheet();
  var lastRow = sheet.getLastRow();

  //No people in the sheet
  if(lastRow == 1)
  {
    formatRow(2, name, id);
    return present(id.toString(), eventName.toString());

  }
  //Atleast 1 person in the sheet
  var nameObjects = sheet.getRange(2, 1, lastRow).getValues();
  for(var i = 0; i < nameObjects.length; i++)
  {
    if(name.toString().toLowerCase() < nameObjects[i][0].toString().toLowerCase())
    {
      sheet.insertRowBefore(i + 2);
      formatRow(i+2, name, id);
      return present(id.toString(), eventName.toString());

    }
  }
  //The new name is last alphabetically and is inserted at the end
  formatRow(lastRow + 1, name, id);
  return present(id.toString(), eventName.toString());
}

function countAttendees(eventCol)
{
  var sheet = SpreadsheetApp.getActiveSheet();
  var lastRow = sheet.getLastRow();
  var sum = 0;
  var range = sheet.getRange(2, eventCol, lastRow - 1).getValues();
  for (var i = 0; i < lastRow - 1; i++)
  {
    if(typeof range[i][0] == 'number')
    {
      sum += range[i][0];
    }
  }
  return sum;
}

/**
 * Inserts a new Event column before the ID column, sets the attendance of
 * all existing people for this event to zero.
 */
function addEvent(eventName)
{
  var sheet = SpreadsheetApp.getActiveSheet();
  var lastCol = sheet.getLastColumn();
  var eventCol = getEventColumn(eventName)
  var eventDetails= {};
  eventDetails['name'] = eventName;
  eventDetails['alreadyExisted'] = false;
  if (eventCol != -1)
  {
    var ui = SpreadsheetApp.getUi();
    var result = ui.alert('The event you are trying to create already exists.',
      'Would you like to continue with the existing event?',
      ui.ButtonSet.YES_NO_CANCEL);
    if (result == ui.Button.CANCEL)
    {
      throw Error("");
    }
    else if (result == ui.Button.NO)
    {
      sheet.deleteColumn(eventCol);
    }
    else if (result == ui.Button.YES)
    {
      eventDetails['alreadyExisted'] = true;

      eventDetails['present'] = countAttendees(eventCol);
      eventDetails['total'] = sheet.getLastRow() - 1;
      return eventDetails;
    }
  }
 lastCol = sheet.getLastColumn();
 var lastRow = sheet.getLastRow();
 sheet.insertColumnBefore(lastCol);
 sheet.getRange(1, lastCol).setValue(eventName);
 if ( (lastRow -1) >= 2)
 {
   sheet.getRange(2,lastCol,lastRow - 1).setValue(0);
 }
 else if (lastRow == 2)
 {
   sheet.getRange(2,lastCol).setValue(0);
 }
 return eventDetails;
}
